import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int total = -1;
        while (total < 0) {
            System.out.println("Enter the movie length in seconds:");
            if (input.hasNextInt()) {
                total = input.nextInt();
                if (total < 0) {
                    System.out.println("Use zero or a positive integer.");
                }
            } else {
                System.out.println("Please enter an integer.");
                input.next();
            }
        }
        int hours = total / 3600;
        int remaining = total % 3600;
        int minutes = remaining / 60;
        int seconds = remaining % 60;
        System.out.print(hours);
        if (hours == 1) {
            System.out.print(" hour, ");
        } else {
            System.out.print(" hours, ");
        }
        System.out.print(minutes);
        if (minutes == 1) {
            System.out.print(" minute, ");
        } else {
            System.out.print(" minutes, ");
        }
        System.out.print(seconds);
        if (seconds == 1) {
            System.out.println(" second.");
        } else {
            System.out.println(" seconds.");
        }

        input.close();
    }
}
