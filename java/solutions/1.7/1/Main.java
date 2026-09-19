import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int number = 0;
        while (number <= 100) {
            System.out.print(number + " ");
            number += 2;
        }

        input.close();
    }
}
