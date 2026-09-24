import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int sum = 0;
        while (sum <= 0) {
            System.out.println("Enter a positive integer sum:");
            if (input.hasNextInt()) {
                sum = input.nextInt();
                if (sum <= 0) System.out.println("The sum must be positive.");
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        int product = 0;
        while (product <= 0) {
            System.out.println("Enter a positive integer product:");
            if (input.hasNextInt()) {
                product = input.nextInt();
                if (product <= 0) System.out.println("The product must be positive.");
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        boolean found = false;
        for (int first = 1; first <= sum / 2; first++) {
            int second = sum - first;
            if ((long) first * second == product) {
                System.out.println(first + " and " + second);
                found = true;
                break;
            }
        }
        if (!found) {
            System.out.println("No positive integer pair exists.");
        }

        input.close();
    }
}
