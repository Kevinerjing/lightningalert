import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        double sum = 0;
        int count = 0;
        while (count < 10) {
            System.out.println("Enter a number:");
            if (input.hasNextDouble()) {
                double number = input.nextDouble();
                if (Double.isFinite(number)) {
                    sum = sum + number;
                    count++;
                } else {
                    System.out.println("Use a finite number.");
                }
            } else {
                System.out.println("Please enter a number.");
                input.next();
            }
        }
        System.out.println(sum);

        input.close();
    }
}
