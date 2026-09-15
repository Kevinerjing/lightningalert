import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter a five-digit lottery ticket number:");
        int number = input.nextInt();

        if (number < 10000 || number > 99999) {
            System.out.println("Your number is invalid");
        } else if (number == 34567) {
            System.out.println("You have won $1,000,000");
        } else {
            System.out.println("Better luck next time!");
        }
    }
}
