import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        double mark = input.nextDouble();

        if (mark >= 80) {
            System.out.println("Level 4");
        } else if (mark >= 70) {
            System.out.println("Level 3");
        } else if (mark >= 60) {
            System.out.println("Level 2");
        } else if (mark >= 50) {
            System.out.println("Level 1");
        } else {
            System.out.println("Level 0");
        }
    }
}
