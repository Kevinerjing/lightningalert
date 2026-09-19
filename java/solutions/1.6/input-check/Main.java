import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter an integer and a decimal number separated by a space:");
        if (input.hasNextInt()) {
            int firstNumber = input.nextInt();
            if (input.hasNextDouble()) {
                double secondNumber = input.nextDouble();
                System.out.println("First number " + firstNumber);
                System.out.println("Second number " + secondNumber);
            } else {
                System.out.println("This is invalid. You must enter a double.");
            }
        } else {
            System.out.println("This is invalid. You must enter an integer as the first value.");
        }

        input.close();
    }
}
