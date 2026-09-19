import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        System.out.println("Enter a word and a non-negative repeat count:");
        String word = input.next();
        int repeats = -1;
        while (repeats < 0) {
            while (!input.hasNextInt()) {
                input.next();
                System.out.println("Enter an integer count:");
            }
            repeats = input.nextInt();
            if (repeats < 0) {
                System.out.println("Count must be at least 0:");
            }
        }
        int count = 0;
        while (count < repeats) {
            System.out.print(word + " ");
            count++;
        }

        input.close();
    }
}
