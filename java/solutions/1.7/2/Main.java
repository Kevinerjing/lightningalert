import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int number = 1;
        while (number <= 100) {
            System.out.print(number + " ");
            if (number % 10 == 0) {
                System.out.println();
            }
            number++;
        }

        input.close();
    }
}
