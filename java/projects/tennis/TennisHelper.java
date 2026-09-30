import java.util.InputMismatchException;
import java.util.Scanner;

public class TennisHelper {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        String playerName = "Kevin";
        boolean running = true;
        System.out.println("Welcome, " + playerName + "!");

        while (running) {
            System.out.println("\nTennis Training Helper");
            System.out.println("1. Check serve success rate");
            System.out.println("2. Total practice time for 5 days");
            System.out.println("3. Exit");
            System.out.print("Choose 1, 2 or 3: ");
            int choice = readInt(input);

            switch (choice) {
                case 1:
                    System.out.print("Total serve attempts (1-1000): ");
                    int attempts = readInt(input);
                    System.out.print("Successful serves: ");
                    int successful = readInt(input);
                    if (attempts < 1 || attempts > 1000
                            || successful < 0 || successful > attempts) {
                        System.out.println("Use 1-1000 attempts and successes from 0 to attempts.");
                    } else {
                        double rate = calculateSuccessRate(successful, attempts);
                        System.out.printf("Success rate: %.1f%%%n", rate);
                        // These are practice goals, not official tennis ratings.
                        if (rate >= 80) {
                            System.out.println("Practice goal reached!");
                        } else if (rate >= 60) {
                            System.out.println("Getting closer to the practice goal.");
                        } else {
                            System.out.println("Keep practising your serve.");
                        }
                    }
                    break;
                case 2:
                    int totalMinutes = 0;
                    boolean valid = true;
                    for (int day = 1; day <= 5; day++) {
                        System.out.print("Minutes for day " + day + " (0-1440): ");
                        int minutes = readInt(input);
                        if (minutes < 0 || minutes > 1440) {
                            System.out.println("Invalid minutes. Start again from the menu.");
                            valid = false;
                            break;
                        }
                        totalMinutes = totalMinutes + minutes;
                    }
                    if (valid) {
                        int hours = totalMinutes / 60;
                        int remainingMinutes = totalMinutes % 60;
                        System.out.println("Total: " + hours + " hours, "
                                + remainingMinutes + " minutes");
                        System.out.printf("Daily average: %.1f minutes%n", totalMinutes / 5.0);
                    }
                    break;
                case 3:
                    running = false;
                    break;
                default:
                    System.out.println("Choose 1, 2 or 3.");
            }
        }
        System.out.println("See you next practice!");
        input.close();
    }

    public static double calculateSuccessRate(int successful, int attempts) {
        return successful * 100.0 / attempts;
    }

    // Retry incorrect number types; range checks happen in main.
    public static int readInt(Scanner input) {
        while (true) {
            try {
                return input.nextInt();
            } catch (InputMismatchException e) {
                input.nextLine(); // Discard the bad input line before retrying.
                System.out.print("Please enter a whole number: ");
            }
        }
    }
}
