import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int num1 = input.nextInt();
        int num2 = input.nextInt();

        if (num1 > num2) {
            System.out.println(num1 + " is larger than " + num2);
        } else if (num2 > num1) {
            System.out.println(num2 + " is larger than " + num1);
        } else {
            System.out.println("The numbers are equal");
        }
    }
}
