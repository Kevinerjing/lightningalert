import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter an integer limit:");
        while (!input.hasNextInt()) {
            System.out.println("Please enter an integer.");
            input.next(); // discard one invalid token
        }
        int limit = input.nextInt();
        for (int candidate = 2; candidate < limit; candidate++) {
            boolean isPrime = true;
            for (int divisor = 2; divisor <= candidate / 2; divisor++) {
                if (candidate % divisor == 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                System.out.print(candidate + " ");
            }
        }
        System.out.println();

        input.close();
    }
}
