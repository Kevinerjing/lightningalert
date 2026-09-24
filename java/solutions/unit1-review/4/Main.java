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
        boolean isSquare = false;
        for (long root = 0; root * root <= number; root++) {
            if (root * root == number) {
                isSquare = true;
                break;
            }
        }
        if (isSquare) {
            System.out.println(number + " is a perfect square");
        } else {
            System.out.println(number + " is not a perfect square");
        }

        input.close();
    }
}
