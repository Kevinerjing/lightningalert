
public class Main {
    public static void main(String[] args) {

        int choice = 2;
        switch (choice) {
            case 1 -> System.out.println("Rock");
            case 2 -> System.out.println("Paper");
            case 3 -> System.out.println("Scissors");
            default -> System.out.println("Invalid");
        }
    }
}
