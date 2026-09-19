import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int num = 0;
        while (num < 1) {
            System.out.println("Enter an integer at least 1:");
            while (!input.hasNextInt()) {
                input.nextLine();
                System.out.println("Please enter an integer:");
            }
            num = input.nextInt();
            input.nextLine();
        }
        int sevens = 0;
        while (num >= 1) {
            int digit = num % 10;
            if (digit == 7) {
                sevens++;
            }
            num = num / 10;
        }
        System.out.println("Sevens: " + sevens);

        input.close();
    }
}
