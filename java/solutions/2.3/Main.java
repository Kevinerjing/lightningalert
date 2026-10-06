import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        System.out.print("Enter a line of text: ");
        String text = input.nextLine();
        System.out.print("Enter one character to count: ");
        String target = input.nextLine();
        while (target.length() != 1) {
            System.out.print("Enter exactly one character: ");
            target = input.nextLine();
        }
        char c = target.charAt(0);
        System.out.println("Before first match: " + charFinder(c, text));
        System.out.println("Matches: " + countChar(text, c));
        System.out.println("Text vertically:");
        printVertical(text);
        input.close();
    }

    // Policy when absent: return the whole original string.
    public static String charFinder(char c, String str) {
        int index = str.indexOf(c);
        if (index == -1) {
            return str;
        }
        return str.substring(0, index);
    }
    public static int countChar(String str, char c) {
        int count = 0;
        for (int i = 0; i < str.length(); i++) {
            if (str.charAt(i) == c) {
                count++;
            }
        }
        return count;
    }
    public static void printVertical(String str) {
        for (int i = 0; i < str.length(); i++) {
            System.out.println(str.charAt(i));
        }
    }
}
