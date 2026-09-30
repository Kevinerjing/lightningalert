public class Main {
    public static void main(String[] args) {
        printHello();
        System.out.println(calcArea(2, 3));
        System.out.println(findGreater(4.5, 8.2));
        printName("Kevin");
        System.out.println(messageGenerator());
        System.out.println(textRepeater("Hello", 4));
        System.out.println(gcf(256, 300));
        System.out.println(gcf(1256, 23452));
        System.out.printf("Circle area: %.2f%n", calcCircleArea(5));
    }

    public static void printHello() {
        System.out.println("Hello World!");
    }

    public static int calcArea(int length, int width) {
        return length * width;
    }

    public static double findGreater(double first, double second) {
        if (first >= second) {
            return first;
        } else {
            return second;
        }
    }

    public static void printName(String name) {
        System.out.println("Your name is: " + name);
    }

    public static String messageGenerator() {
        return "This is a returned message.";
    }

    public static String textRepeater(String word, int n) {
        String result = "";
        for (int i = 0; i < n; i++) {
            result = result + word + " ";
        }
        return result;
    }

    // Classroom algorithm: both arguments must be positive integers.
    public static int gcf(int n, int p) {
        int divisor;
        if (n < p) {
            divisor = n;
        } else {
            divisor = p;
        }
        while (divisor > 0) {
            if (n % divisor == 0 && p % divisor == 0) {
                return divisor;
            }
            divisor--;
        }
        return 1;
    }

    public static double calcCircleArea(int radius) {
        return Math.PI * radius * radius;
    }
}
