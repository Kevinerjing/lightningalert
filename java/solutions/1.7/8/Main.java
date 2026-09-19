import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        double total = 0;
        int count = 0;
        System.out.println("Enter positive integers; enter 0 to finish:");
        while (true) {
            while (!input.hasNextInt()) {
                input.next();
                System.out.println("Enter an integer:");
            }
            int number = input.nextInt();
            if (number == 0) {
                break;
            }
            if (number > 0) {
                total += number;
                count++;
            } else {
                System.out.println("Use a positive integer, or 0 to finish.");
            }
        }
        if (count > 0) {
            System.out.println(total / count);
        } else {
            System.out.println("No numbers entered.");
        }

        input.close();
    }
}
