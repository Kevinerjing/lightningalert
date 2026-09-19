import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int n = 0;
        while (n < 1) {
            System.out.println("Enter an integer at least 1:");
            while (!input.hasNextInt()) {
                input.nextLine();
                System.out.println("Please enter an integer:");
            }
            n = input.nextInt();
            input.nextLine();
        }
        int number = 1;
        while (number <= n) {
            System.out.print(number);
            if (number < n) {
                System.out.print(", ");
            }
            number++;
        }

        input.close();
    }
}
