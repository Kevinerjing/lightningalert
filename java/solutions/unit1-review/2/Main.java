
public class Main {
    public static void main(String[] args) {

        for (int number = 5; number <= 100; number++) {
            if (number % 3 == 0 || number % 5 == 0) {
                System.out.print(number + ", ");
            }
        }
        System.out.println();
    }
}
