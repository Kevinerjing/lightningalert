import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter three integer side lengths:");
        if (!input.hasNextInt()) {
            System.out.println("A value entered is not an integer. Exiting program.");
            input.close();
            return;
        }
        int a = input.nextInt();
        if (!input.hasNextInt()) {
            System.out.println("A value entered is not an integer. Exiting program.");
            input.close();
            return;
        }
        int b = input.nextInt();
        if (!input.hasNextInt()) {
            System.out.println("A value entered is not an integer. Exiting program.");
            input.close();
            return;
        }
        int c = input.nextInt();
        if (a <= 0 || b <= 0 || c <= 0) {
            System.out.println("Side lengths must be positive.");
        } else if ((long) a + b <= c || (long) a + c <= b || (long) b + c <= a) {
            System.out.println("These sides do not form a triangle.");
        } else if (a == b && b == c) {
            System.out.println("Equilateral");
        } else if (a == b || b == c || a == c) {
            System.out.println("Isosceles");
        } else {
            System.out.println("Scalene");
        }

        input.close();
    }
}
