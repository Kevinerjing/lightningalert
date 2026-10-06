public class Main {
    public static void main(String[] args) {
        System.out.println(secondsRem(1378)); // 58
        System.out.println(minutesRem(125)); // 2
        System.out.println(hoursRem(21605)); // 6
        System.out.println(convertTime(7351)); // 02:02:31
        System.out.println(solveLinearX(4, -1, 0)); // 0.25
        System.out.println(checkQuad(1, -2, -8, -2, 4)); // true
        System.out.println(checkQuad(1, -2, -8, 0, 6)); // false
    }

    // These three helpers assume a nonnegative number of seconds.
    public static int secondsRem(int sec) {
        return sec % 60;
    }
    public static int minutesRem(int sec) {
        return sec / 60 % 60;
    }
    public static int hoursRem(int sec) {
        return sec / 3600;
    }
    // This study version accepts one clock day: 0 to 86399 seconds.
    public static String convertTime(int sec) {
        if (sec < 0 || sec >= 86400) {
            return "Invalid time";
        }
        int hours = hoursRem(sec);
        int minutes = minutesRem(sec);
        int seconds = secondsRem(sec);
        String h = "" + hours;
        String m = "" + minutes;
        String s = "" + seconds;
        if (hours < 10) { h = "0" + h; }
        if (minutes < 10) { m = "0" + m; }
        if (seconds < 10) { s = "0" + s; }
        return h + ":" + m + ":" + s;
    }
    // Contract: slope is nonzero, so there is exactly one x.
    public static double solveLinearX(double slope, double yIntercept, double yValue) {
        return (yValue - yIntercept) / slope;
    }
    // Ordinary finite classroom coefficients; a must be nonzero.
    public static boolean checkQuad(double a, double b, double c, double x1, double x2) {
        if (a == 0) { return false; }
        double discriminant = b * b - 4 * a * c;
        if (discriminant < 0) { return false; }
        double root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        double root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        double tolerance = 0.000001;
        boolean sameOrder = Math.abs(x1 - root1) < tolerance
                && Math.abs(x2 - root2) < tolerance;
        boolean swappedOrder = Math.abs(x1 - root2) < tolerance
                && Math.abs(x2 - root1) < tolerance;
        return sameOrder || swappedOrder;
    }
}
