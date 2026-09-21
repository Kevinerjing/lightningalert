public class Main {
    public static void main(String[] args) {
        for (int number = 5; number <= 200; number += 5) {
            System.out.print(number + ",");
            if (number % 50 == 0) {
                System.out.println();
            }
        }
    }
}
