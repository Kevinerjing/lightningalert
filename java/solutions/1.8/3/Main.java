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
        for (int candidate = 1; candidate <= num; candidate++) {
            if (num % candidate == 0) {
                System.out.print(candidate + " ");
            }
            if (candidate == num) {
                break;
            }
        }
        System.out.println();

        input.close();
    }
}
