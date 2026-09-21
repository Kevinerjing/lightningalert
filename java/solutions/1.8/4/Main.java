import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int num = 0;
        while (num <= 0) {
            System.out.println("Enter a positive integer:");
            while (!input.hasNextInt()) {
                input.nextLine();
                System.out.println("Please enter an integer:");
            }
            num = input.nextInt();
            input.nextLine();
        }
        long reversed = 0;
        for (int remaining = num; remaining > 0; remaining /= 10) {
            int digit = remaining % 10;
            reversed = reversed * 10 + digit;
        }
        if (reversed == num) {
            System.out.println(num + " is a palindrome");
        } else {
            System.out.println(num + " is not a palindrome");
        }

        input.close();
    }
}
