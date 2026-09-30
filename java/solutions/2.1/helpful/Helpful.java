public class Helpful {
    public static double triangleArea(double base, double height) {
        return base * height / 2;
    }

    public static double average(int n1, int n2, int n3) {
        double total = n1;
        total = total + n2 + n3;
        return total / 3;
    }

    public static boolean isDivisible(int num, int div) {
        if (div == 0) {
            return false;
        }
        return num % div == 0;
    }

    // int factorials are accurate for n from 0 through 12.
    public static int factorial(int n) {
        if (n < 0) {
            return -1;
        }
        int product = 1;
        for (int i = 1; i <= n; i++) {
            product = product * i;
        }
        return product;
    }

    public static boolean strongNumber(int n) {
        if (n < 0) {
            return false;
        }
        int remaining = n;
        int sum = 0;
        do {
            int digit = remaining % 10;
            sum = sum + factorial(digit);
            remaining = remaining / 10;
        } while (remaining > 0);
        return sum == n;
    }

    // Count digits; a minus sign is not a digit.
    public static int size(int n) {
        long remaining = n;
        if (remaining < 0) {
            remaining = -remaining;
        }
        int count = 1;
        while (remaining >= 10) {
            remaining = remaining / 10;
            count++;
        }
        return count;
    }

    public static boolean armstrongNumbers(int n) {
        if (n <= 0) {
            return false;
        }
        int length = size(n);
        int remaining = n;
        long sum = 0;
        while (remaining > 0) {
            int digit = remaining % 10;
            long power = 1;
            for (int i = 1; i <= length; i++) {
                power = power * digit;
            }
            sum = sum + power;
            remaining = remaining / 10;
        }
        return sum == n;
    }
}
