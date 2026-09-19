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
        int odd = 0;
        int even = 0;
        while (num >= 1) {
            int digit = num % 10;
            if (digit % 2 == 0) {
                even++;
            } else {
                odd++;
            }
            num /= 10;
        }
        System.out.println("Odd: " + odd);
        System.out.println("Even: " + even);

        input.close();
    }
}
