import time


class Stack:
    def __init__(self):
        self.items = []

    def is_empty(self):
        return len(self.items) == 0

    def push(self, item):
        self.items.append(item)

    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        raise IndexError("pop from empty stack")

    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        raise IndexError("peek from empty stack")

    def size(self):
        return len(self.items)

    def __str__(self):
        return str(self.items)


class TowerOfHanoi:
    def __init__(self, n: int):
        self.n = n

        self.reset_step()
        self.reset_towers()
        self.reset_moves()
        self.last_action = f"Ready with {self.n} disks."

    def get_n(self) -> int:
        return self.n

    def get_step(self) -> int:
        return self.step

    def get_last_action(self) -> str:
        return self.last_action

    def get_tower(self, tower: str) -> dict:
        return self.towers[tower]

    def reset_step(self):
        self.step = 0

    def reset_towers(self):
        self.towers = {"A": Stack(), "B": Stack(), "C": Stack()}

        for disk in range(self.n, 0, -1):
            self.towers["A"].push(disk)

    def reset_moves(self):
        self.move_stk = Stack()
        self.redo_stk = Stack()

    def __str__(self) -> str:
        return f"Tower A: {self.towers['A']}\nTower B: {self.towers['B']}\nTower C: {self.towers['C']}"

    def check_win(self) -> bool:
        if self.towers["C"].size() != self.n:
            return False

        print("You win!")
        print(f"Total steps taken: {self.step}")
        print(f"Optimal steps expected (2^{self.n} - 1): {2**self.n - 1}")

        self.last_action = f"You win! Steps: {self.step}. Optimal: {2**self.n - 1}."

        return True

    def move_disk(self, src: str, dest: str, is_solving: bool = False):
        # check if src tower is empty
        if self.towers[src].is_empty():
            print(f"Invalid move: source tower is empty.")
            self.last_action = "Invalid move: source tower is empty."
            return False

        # check if top disk on src tower is smaller than top disk on dest tower
        if (
            not self.towers[dest].is_empty()
            and self.towers[src].peek() > self.towers[dest].peek()
        ):
            print(
                "Invalid move: disk from source is larger than top disk in dest tower."
            )
            self.last_action = (
                "Invalid move: disk from source is larger than top disk in dest tower."
            )
            return False

        # move disk
        disk = self.towers[src].pop()
        self.towers[dest].push(disk)

        # increment step
        self.step += 1

        self.last_action = f"Step {self.step}: Move disk from {src} to {dest}."

        # print step count and movement
        print(f"Step {self.step}")
        print(f"Moving disk from {src} to {dest}")
        print(str(self) + "\n")

        # record move for undo/redo
        self.move_stk.push((src, dest))
        self.redo_stk = Stack()  # clear redo stack on new move

        # check win condition
        self.check_win()

        # if solving, add a small delay for better visualization
        if is_solving:
            time.sleep(0.5)

    def undo_move(self):
        # check if there are moves to undo
        if self.move_stk.is_empty():
            print("No moves to undo.")
            self.last_action = "No moves to undo."
            return

        # undo last move
        src, dest = self.move_stk.pop()
        disk = self.towers[dest].pop()
        self.towers[src].push(disk)

        # decrement step
        self.step -= 1

        self.last_action = f"Step {self.step}: Undo move from {dest} to {src}."

        # print step count and movement
        print(f"Step {self.step}")
        print(f"Undoing move: moving disk from {dest} to {src}")
        print(str(self) + "\n")

        # record move for redo
        self.redo_stk.push((src, dest))

    def redo_move(self):
        # check if there are moves to redo
        if self.redo_stk.is_empty():
            print("No moves to redo.")
            self.last_action = "No moves to redo."
            return

        # redo last undone move
        src, dest = self.redo_stk.pop()
        disk = self.towers[src].pop()
        self.towers[dest].push(disk)

        # increment step
        self.step += 1

        self.last_action = f"Step {self.step}: Redo move from {src} to {dest}."

        # print step count and movement
        print(f"Step {self.step}")
        print(f"Redoing move: moving disk from {src} to {dest}")
        print(str(self) + "\n")

        # record move for undo
        self.move_stk.push((src, dest))

    def solve_recursive(self, n: int, src: str, dest: str, aux: str):
        if n == 1:
            self.move_disk(src, dest, is_solving=True)
            return

        self.solve_recursive(n - 1, src, aux, dest)
        self.move_disk(src, dest, is_solving=True)
        self.solve_recursive(n - 1, aux, dest, src)

    def solve(self):
        # reset step and towers
        self.reset_step()
        self.reset_towers()

        # print initial state
        print(f"Solving for {self.n} disks")
        print("Starting arrangement:")
        print(str(self) + "\n")
        time.sleep(0.5)

        # solve recursively
        self.solve_recursive(self.n, "A", "C", "B")


MENU = """\nTower of Hanoi
Please choose an option:
1. Start/Reset Game
2. Make a Move
3. Undo move
4. Redo move
5. Solve Puzzle
6. Exit
"""


def main():
    print("\033cWelcome to the Tower of Hanoi Game!")

    n = int(input("Enter number of disks (3-10): "))
    while n < 3 or n > 10:
        n = int(input("Please enter a valid number of disks (3-10): "))

    game = TowerOfHanoi(n)

    while True:
        print(MENU)
        choice = input("Enter your choice (1-6): ")

        if choice == "1":
            game.reset_step()
            game.reset_towers()
            game.reset_moves()
            print("Game reset.")
            print(str(game) + "\n")

        elif choice == "2":
            src = input("Enter source tower (A, B, C): ").upper()
            dest = input("Enter destination tower (A, B, C): ").upper()
            if src in game.towers and dest in game.towers:
                game.move_disk(src, dest)
            else:
                print("Invalid tower names. Please use A, B, or C.")

        elif choice == "3":
            game.undo_move()

        elif choice == "4":
            game.redo_move()

        elif choice == "5":
            game.solve()

        elif choice == "6":
            print("Exiting the game. Goodbye!")
            break

        else:
            print("Invalid choice. Please enter a number between 1 and 6.")


if __name__ == "__main__":
    main()
