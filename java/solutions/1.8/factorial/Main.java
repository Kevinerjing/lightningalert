import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter an integer from 1 to 12:");
        if (input.hasNextInt()) {
            int number = input.nextInt();
            if (number >= 1 && number <= 12) {
                int factorial = 1;
                for (int i = 1; i <= number; i++) {
                    factorial = factorial * i;
                }
                System.out.println(number + "! = " + factorial);
            } else {
                System.out.println("Enter a value from 1 to 12.");
            }
        } else {
            System.out.println("Invalid input.");
        }

        input.close();
    }
}
