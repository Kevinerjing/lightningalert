import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int n = 0;
        while (n <= 0) {
            System.out.println("Enter a positive integer:");
            if (input.hasNextInt()) {
                n = input.nextInt();
                if (n <= 0) System.out.println("Incorrect input: use a positive integer.");
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        int number = 1;
        while (number <= n) {
            if (number > 1) System.out.print(", ");
            System.out.print(number);
            if (number == n) break;
            number++;
        }
        System.out.println();

        input.close();
    }
}
