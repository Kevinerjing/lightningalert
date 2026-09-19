import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter an integer base:");
        int base = input.nextInt();
        System.out.println("Enter a non-negative integer exponent:");
        int exponent = input.nextInt();
        if (exponent < 0 || (base == 0 && exponent == 0)) {
            System.out.println("Use a non-negative exponent; 0^0 is not handled here.");
        } else {
            long result = 1;
            int count = 0;
            while (count < exponent) {
                result *= base;
                count++;
            }
            System.out.println(result);
        }

        input.close();
    }
}
