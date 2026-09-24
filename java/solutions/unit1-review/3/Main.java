
public class Main {
    public static void main(String[] args) {

        int number = 0;
        for (int digit = 9; digit >= 1; digit--) {
            number = number * 10 + digit;
            System.out.println(number);
        }
    }
}
