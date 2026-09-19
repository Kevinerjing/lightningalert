import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        double total = 0;
        int count = 0;
        while (count < 10) {
            while (!input.hasNextDouble()) {
                input.next();
                System.out.println("Enter a number:");
            }
            double number = input.nextDouble();
            total += number;
            count++;
        }
        System.out.println(total);

        input.close();
    }
}
