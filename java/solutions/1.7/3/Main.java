import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        int time = -1;
        while (time < 0 || time > 23) {
            System.out.println("Enter an integer from 0 to 23:");
            while (!input.hasNextInt()) {
                input.nextLine();
                System.out.println("Please enter an integer:");
            }
            time = input.nextInt();
            input.nextLine();
        }
        if (time == 0) {
            System.out.println("It is 12 am.");
        } else if (time < 12) {
            System.out.println("It is " + time + " am.");
        } else if (time == 12) {
            System.out.println("It is 12 pm.");
        } else {
            System.out.println("It is " + (time - 12) + " pm.");
        }

        input.close();
    }
}
