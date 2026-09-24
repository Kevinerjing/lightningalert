import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter an integer:");
        while (!input.hasNextInt()) {
            System.out.println("Please enter an integer.");
            input.next(); // discard one invalid token
        }
        int number = input.nextInt();
        long remaining = number;
        if (remaining < 0) {
            remaining = -remaining;
        }
        int sum = 0;
        while (remaining > 0) {
            int digit = (int) (remaining % 10);
            sum = sum + digit;
            remaining = remaining / 10;
        }
        System.out.println(sum);

        input.close();
    }
}
