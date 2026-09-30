import java.util.InputMismatchException;
import java.util.Scanner;

public class WeatherHelper {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        String city = "Ottawa";
        boolean running = true;
        System.out.println("Weather Helper for " + city);

        while (running) {
            System.out.println("\n1. Convert Celsius to Fahrenheit");
            System.out.println("2. Summarize 5 daily temperatures");
            System.out.println("3. Exit");
            System.out.print("Choose 1, 2 or 3: ");
            int choice = readInt(input);

            switch (choice) {
                case 1:
                    System.out.print("Temperature in Celsius (-60 to 60): ");
                    double celsius = readDouble(input);
                    if (!(celsius >= -60 && celsius <= 60)) {
                        System.out.println("Use a temperature from -60 to 60 for this exercise.");
                    } else {
                        double fahrenheit = toFahrenheit(celsius);
                        System.out.printf("%.1f C = %.1f F%n", celsius, fahrenheit);
                    }
                    break;
                case 2:
                    double total = 0;
                    int freezingDays = 0;
                    boolean valid = true;
                    for (int day = 1; day <= 5; day++) {
                        System.out.print("Day " + day + " Celsius (-60 to 60): ");
                        double temperature = readDouble(input);
                        if (!(temperature >= -60 && temperature <= 60)) {
                            System.out.println("Invalid temperature. Start again from the menu.");
                            valid = false;
                            break;
                        }
                        total = total + temperature;
                        if (temperature <= 0) {
                            freezingDays++;
                        }
                    }
                    if (valid) {
                        double average = total / 5;
                        System.out.printf("Average: %.1f C%n", average);
                        System.out.println("Days at or below 0 C: " + freezingDays);
                        // Simple classroom labels, not forecasts or safety advice.
                        if (average <= 0) {
                            System.out.println("Average label: freezing or below");
                        } else if (average < 15) {
                            System.out.println("Average label: cool");
                        } else {
                            System.out.println("Average label: mild or warm");
                        }
                    }
                    break;
                case 3:
                    running = false;
                    break;
                default:
                    System.out.println("Choose 1, 2 or 3.");
            }
        }
        System.out.println("Thanks for exploring the weather!");
        input.close();
    }

    public static double toFahrenheit(double celsius) {
        return celsius * 9.0 / 5 + 32;
    }

    public static int readInt(Scanner input) {
        while (true) {
            try {
                return input.nextInt();
            } catch (InputMismatchException e) {
                input.nextLine();
                System.out.print("Please enter a whole number: ");
            }
        }
    }

    public static double readDouble(Scanner input) {
        while (true) {
            try {
                return input.nextDouble();
            } catch (InputMismatchException e) {
                input.nextLine();
                System.out.print("Please enter a number: ");
            }
        }
    }
}
