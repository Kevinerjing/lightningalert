import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Welcome to my fancy new game!");
        System.out.println("Enter any three integers:");
        int num1 = input.nextInt();
        int num2 = input.nextInt();
        int num3 = input.nextInt();

        if (num1 + num2 == num3) {
            System.out.println(num1 + " + " + num2 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else if (num1 - num2 == num3) {
            System.out.println(num1 + " - " + num2 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else if (num2 - num1 == num3) {
            System.out.println(num2 + " - " + num1 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else if (num1 * num2 == num3) {
            System.out.println(num1 + " * " + num2 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else if (num2 != 0 && num1 % num2 == 0 && num1 / num2 == num3) {
            System.out.println(num1 + " / " + num2 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else if (num1 != 0 && num2 % num1 == 0 && num2 / num1 == num3) {
            System.out.println(num2 + " / " + num1 + " = " + num3);
            System.out.println("CONGRATULATIONS - YOU WON!!!");
        } else {
            System.out.println("Sorry, better luck next time.");
        }
    }
}
