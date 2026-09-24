
public class Main {
    public static void main(String[] args) {

        char block = 'C';
        switch (block) {
            case 'A' -> System.out.println("Day 1 at 8:40am");
            case 'B' -> System.out.println("Day 1 at 10:05am");
            case 'C' -> System.out.println("Day 1 at 12:10pm");
            case 'D' -> System.out.println("Day 1 at 1:35pm");
            default -> System.out.println("ERROR");
        }
    }
}
