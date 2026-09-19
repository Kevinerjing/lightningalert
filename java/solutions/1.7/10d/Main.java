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
        boolean found = false;
        while (num >= 100) {
            int right = num % 10;
            int middle = (num / 10) % 10;
            int left = (num / 100) % 10;
            if (left + 1 == middle && middle + 1 == right) {
                found = true;
                break;
            }
            num /= 10;
        }
        System.out.println(found);

        input.close();
    }
}
