public class Main {
    public static void main(String[] args) {
        String str = "Hello!";
        String message = "Welcome to the program.";
        System.out.println(str.charAt(5)); // !
        System.out.println(message.indexOf("the")); // 11
        System.out.println(message.length()); // 23
        System.out.println(message.substring(0, 7)); // Welcome
        if (message.length() > 0) {
            System.out.println(message.charAt(message.length() - 1)); // .
        }

        // The worksheet's other-method challenges.
        String word = "banana";
        System.out.println("apple".compareTo("orange")); // -14
        System.out.println(message.endsWith(".")); // true
        System.out.println(str.equals("Hello!")); // true
        System.out.println(str.equalsIgnoreCase("HELLO!")); // true
        System.out.println(word.indexOf("an")); // 1
        System.out.println(word.indexOf("an", 2)); // 3
        System.out.println(word.lastIndexOf("an")); // 3
        System.out.println(word.lastIndexOf("an", 2)); // 1
        System.out.println(word.length()); // 6
        System.out.println(word.replace('a', 'A')); // bAnAnA
        System.out.println("Happy Birthday!".replaceAll("Happy", "Good"));
        System.out.println("banana".replaceFirst("a", "A")); // bAnana
        System.out.println(message.startsWith("Welcome")); // true
        System.out.println(message.startsWith("the", 11)); // true
        System.out.println(str.substring(3)); // lo!
        System.out.println(str.substring(1, 3)); // el
        System.out.println(str.toLowerCase()); // hello!
        System.out.println(str.toUpperCase()); // HELLO!
        System.out.println(str); // Hello! -- original unchanged
    }
}
