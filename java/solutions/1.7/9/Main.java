import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int start = 0;
        while (start < 1) {
            System.out.println("Enter an integer at least 1:");
            while (!input.hasNextInt()) {
                input.nextLine();
                System.out.println("Please enter an integer:");
            }
            start = input.nextInt();
            input.nextLine();
        }
        long number = start;
        int steps = 0;
        while (number != 1 && steps < 10000) {
            if (number % 2 == 0) {
                number /= 2;
            } else {
                if (number > (Long.MAX_VALUE - 1) / 3) {
                    break;
                }
                number = 3 * number + 1;
            }
            System.out.println(number);
            steps++;
        }
        if (number == 1) {
            System.out.println("Iterations: " + steps);
        } else {
            System.out.println("Stopped at a safety limit before reaching 1.");
        }

        input.close();
    }
}
