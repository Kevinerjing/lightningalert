import java.util.Scanner;
import java.util.InputMismatchException;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        boolean askAgain = true;
        int number = 0;
        do {
            try {
                System.out.println("Enter an integer:");
                number = input.nextInt();
                askAgain = false;
            } catch (InputMismatchException e) {
                System.out.println("Not an integer. Please try again.");
                input.next(); // consume the bad token before retrying
            }
        } while (askAgain);
        System.out.println("You entered " + number);

        input.close();
    }
}
