import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter two integers:");
        while (!input.hasNextInt()) {
            input.next();
            System.out.println("Please enter an integer:");
        }
        int first = input.nextInt();
        while (!input.hasNextInt()) {
            input.next();
            System.out.println("Please enter the second integer:");
        }
        int last = input.nextInt();
        if (first <= last) {
            for (int i = first; i <= last; i++) {
                System.out.print(i + " ");
                if (i == last) {
                    break;
                }
            }
        } else {
            for (int i = first; i >= last; i--) {
                System.out.print(i + " ");
                if (i == last) {
                    break;
                }
            }
        }
        System.out.println();

        input.close();
    }
}
