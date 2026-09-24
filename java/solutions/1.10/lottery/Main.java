import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int number = 0;
        while (number < 10000 || number > 99999) {
            System.out.println("Enter a five-digit integer:");
            if (input.hasNextInt()) {
                number = input.nextInt();
                if (number < 10000 || number > 99999) {
                    System.out.println("Use a number from 10000 to 99999.");
                }
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        System.out.println("Valid number: " + number);

        input.close();
    }
}
