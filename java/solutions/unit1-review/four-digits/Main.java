import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int number = 0;
        while (number < 1000 || number > 9999) {
            System.out.println("Enter a four-digit integer:");
            if (input.hasNextInt()) {
                number = input.nextInt();
                if (number < 1000 || number > 9999) {
                    System.out.println("Use 1000 through 9999.");
                }
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        int sum = 0;
        while (number > 0) {
            sum = sum + number % 10;
            number = number / 10;
        }
        System.out.println(sum);

        input.close();
    }
}
