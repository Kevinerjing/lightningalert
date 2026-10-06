window.JAVA_DAILY_TASKS = [
  {
    "id": 1,
    "title": "Three-number report",
    "kind": "code",
    "course": [
      "lesson15.html",
      "lesson17.html"
    ],
    "reason": "Unit 1 Part C: complete all requested outputs and repeat the task.",
    "prompt": "Write a complete Main.java. Read three integers and print their sum, integer average, product, smallest and largest. Repeat for exactly two sets using a loop. Use ordinary small integers, including negative values. The integer average deliberately follows the teacher’s exam samples. Do not hard-code the sample inputs.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        for (int round = 1; round <= 2; round++) {\n            int a = input.nextInt();\n            int b = input.nextInt();\n            int c = input.nextInt();\n            int sum = a + b + c;\n            int average = sum / 3;\n            int product = a * b * c;\n            int smallest = a;\n            int largest = a;\n            if (b < smallest) { smallest = b; }\n            if (c < smallest) { smallest = c; }\n            if (b > largest) { largest = b; }\n            if (c > largest) { largest = c; }\n            System.out.println(\"Sum: \" + sum);\n            System.out.println(\"Average: \" + average);\n            System.out.println(\"Product: \" + product);\n            System.out.println(\"Smallest: \" + smallest);\n            System.out.println(\"Largest: \" + largest);\n        }\n        input.close();\n    }\n}",
    "tests": [
      [
        "11 30 17; then 5 2 7",
        "58, 19, 5610, 11, 30; then 14, 4, 70, 2, 7"
      ],
      [
        "-4 -2 -9; then 5 5 5",
        "-15, -5, -72, -9, -2; then 15, 5, 125, 5, 5"
      ]
    ],
    "hints": [
      "List all five outputs before writing syntax.",
      "Initialize smallest and largest from a, then compare b and c separately.",
      "Keep sum unchanged; store average in a different variable."
    ],
    "errors": [],
    "broken": null,
    "trace": null,
    "variant": "Repeat for three sets. Use a decimal average with sum / 3.0 and update the expected outputs."
  },
  {
    "id": 2,
    "title": "Repair a prime-number printer",
    "kind": "debug",
    "course": [
      "lesson18.html",
      "lesson15.html"
    ],
    "reason": "Unit 1 Part B: scan the entire program, including nested-loop direction and modulo.",
    "prompt": "The program should print every prime from 20 through 30 inclusive. Find all problems; record line number, type, reason and a complete correction. Fix compilation first, then trace 20 and 23.",
    "solution": "public class Main {\n    public static void main(String[] args) {\n        for (int n = 20; n <= 30; n++) {\n            int count = 0;\n            for (int d = 2; d <= n / 2; d++) {\n                if (n % d == 0) {\n                    count++;\n                    break;\n                }\n            }\n            if (count == 0) {\n                System.out.println(n + \" is prime\");\n            }\n        }\n    }\n}",
    "tests": [
      [
        "No input",
        "23 is prime\n29 is prime"
      ]
    ],
    "hints": [
      "Check class/main spelling and each variable declaration.",
      "Does n move toward 30? Which value is the candidate, and which is the divisor?",
      "Start a possible prime divisor at 2. Reset count for each candidate."
    ],
    "errors": [
      [
        1,
        "Syntax",
        "Class must be class."
      ],
      [
        2,
        "Syntax",
        "Static must be static."
      ],
      [
        3,
        "Logic",
        "Use n++ to move toward 30."
      ],
      [
        4,
        "Syntax",
        "Add the semicolon."
      ],
      [
        5,
        "Syntax",
        "Declare int d."
      ],
      [
        5,
        "Logic",
        "Start d at 2; 0 is not a usable divisor and 1 divides every candidate."
      ],
      [
        6,
        "Logic",
        "Use n % d, not d % n."
      ],
      [
        11,
        "Syntax",
        "Use == for comparison; count = 0 is not a boolean."
      ],
      [
        12,
        "Syntax",
        "Use System.out.println."
      ]
    ],
    "broken": "public Class Main {\n    public Static void main(String[] args) {\n        for (int n = 20; n <= 30; n--) {\n            int count = 0\n            for (d = 0; d <= n / 2; d++) {\n                if (d % n == 0) {\n                    count++;\n                    break;\n                }\n            }\n            if (count = 0) {\n                System.println(n + \" is prime\");\n            }\n        }\n    }\n}",
    "trace": "After repair: n = 20 finds divisor 2 and prints nothing. n = 23 finds no divisor and prints 23 is prime. break exits the inner loop only.",
    "variant": "Change the sample values and solve again from a blank page."
  },
  {
    "id": 3,
    "title": "Five decimal inputs",
    "kind": "code",
    "course": [
      "lesson18.html",
      "lesson15.html"
    ],
    "reason": "Unit 1: read values inside a loop and keep a running total.",
    "prompt": "Read exactly five double values. Print Total and Average to one decimal place. Use a for loop and a double total. Assume valid numeric input. Write a trace table for the sample before coding.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        double total = 0;\n        for (int i = 1; i <= 5; i++) {\n            double value = input.nextDouble();\n            total = total + value;\n        }\n        System.out.printf(\"Total: %.1f%n\", total);\n        System.out.printf(\"Average: %.1f%n\", total / 5);\n        input.close();\n    }\n}",
    "tests": [
      [
        "1.5 2.5 0 -1 7",
        "Total: 10.0\nAverage: 2.0"
      ],
      [
        "0 0 0 0 0",
        "Total: 0.0\nAverage: 0.0"
      ]
    ],
    "hints": [
      "Start total at zero before the loop.",
      "Read a new value on each iteration.",
      "Do not replace total with the latest value."
    ],
    "errors": [],
    "broken": null,
    "trace": "After each sample input, total is 1.5, 4.0, 4.0, 3.0, 10.0. Five iterations; final total 10.0.",
    "variant": "Change the sample values and solve again from a blank page."
  },
  {
    "id": 4,
    "title": "Repair the even-number total",
    "kind": "debug",
    "course": [
      "lesson17.html",
      "lesson18.html"
    ],
    "reason": "Unit 1 Part A/B: distinguish counter, accumulated total and all printed lines.",
    "prompt": "Print Checking once, then sum the even integers from 1 through 6 and print Total: 12. Repair every error. After repair, write the exact output, including text lines.",
    "solution": "public class Main {\n    public static void main(String[] args) {\n        int total = 0;\n        int i = 1;\n        System.out.println(\"Checking\");\n        while (i <= 6) {\n            if (i % 2 == 0) {\n                total = total + i;\n            }\n            i++;\n        }\n        System.out.println(\"Total: \" + total);\n    }\n}",
    "tests": [
      [
        "No input",
        "Checking\nTotal: 12"
      ]
    ],
    "hints": [
      "Follow total and i in separate columns.",
      "Check evenness with the remainder after division by 2.",
      "A semicolon after a while condition creates an empty loop."
    ],
    "errors": [
      [
        3,
        "Syntax",
        "Initialize with =, not ==."
      ],
      [
        6,
        "Logic",
        "Remove the semicolon after while; it creates an empty infinite loop."
      ],
      [
        7,
        "Syntax",
        "Use ==, not assignment =, in this condition."
      ],
      [
        7,
        "Logic",
        "Even numbers have remainder 0, not 1."
      ],
      [
        8,
        "Logic",
        "Add i to the existing total instead of replacing total."
      ],
      [
        10,
        "Logic",
        "Use i++ so the loop moves toward termination."
      ],
      [
        12,
        "Syntax",
        "Use println, not printLn."
      ],
      [
        12,
        "Logic",
        "Print total, not i."
      ]
    ],
    "broken": "public class Main {\n    public static void main(String[] args) {\n        int total == 0;\n        int i = 1;\n        System.out.println(\"Checking\");\n        while (i <= 6); {\n            if (i % 2 = 1) {\n                total = i;\n            }\n            i--;\n        }\n        System.out.printLn(\"Total: \" + i);\n    }\n}",
    "trace": "After repair, total is 0, 2, 2, 6, 6, 12 for i = 1..6. At exit i is 7, but the printed total is 12.",
    "variant": "Change the sample values and solve again from a blank page."
  },
  {
    "id": 5,
    "title": "Seconds into clock text",
    "kind": "code",
    "course": [
      "lesson21.html#extra-practice"
    ],
    "reason": "2.1 Extra Practice: call helpers, return a String, and separate minutes from seconds.",
    "prompt": "Write secondsRem(int sec), minutesRem(int sec), hoursRem(int sec) and convertTime(int sec). Assume 0 <= sec < 86400. Return clock text HH:MM:SS with leading zeros. In main read one integer and print the returned text. Use helpers and simple if statements; no printf or String.format is needed.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        int sec = input.nextInt();\n        System.out.println(convertTime(sec));\n        input.close();\n    }\n    public static int secondsRem(int sec) { return sec % 60; }\n    public static int minutesRem(int sec) { return sec / 60 % 60; }\n    public static int hoursRem(int sec) { return sec / 3600; }\n    public static String convertTime(int sec) {\n        int hours = hoursRem(sec);\n        int minutes = minutesRem(sec);\n        int seconds = secondsRem(sec);\n        String h = \"\" + hours;\n        String m = \"\" + minutes;\n        String s = \"\" + seconds;\n        if (hours < 10) { h = \"0\" + h; }\n        if (minutes < 10) { m = \"0\" + m; }\n        if (seconds < 10) { s = \"0\" + s; }\n        return h + \":\" + m + \":\" + s;\n    }\n}",
    "tests": [
      [
        "7351",
        "02:02:31"
      ],
      [
        "0",
        "00:00:00"
      ],
      [
        "86399",
        "23:59:59"
      ]
    ],
    "hints": [
      "sec % 60 keeps the remaining seconds.",
      "sec / 60 gives total minutes; use % 60 afterward.",
      "return gives the text to main; main prints it."
    ],
    "errors": [],
    "broken": null,
    "trace": null,
    "variant": "Use 3661 seconds, then 59 seconds. Trace the arguments, parameters and returned text."
  },
  {
    "id": 6,
    "title": "Repair a reusable average method",
    "kind": "debug",
    "course": [
      "lesson21.html"
    ],
    "reason": "2.1 Methods: correct types, decimal division and return versus print.",
    "prompt": "Read three integers, call average(int a, int b, int c), and print its decimal result. Assume small values. Repair the main method and helper; preserve the helper name and its three int parameters.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        int a = input.nextInt();\n        int b = input.nextInt();\n        int c = input.nextInt();\n        double result = average(a, b, c);\n        System.out.println(result);\n        input.close();\n    }\n    public static double average(int a, int b, int c) {\n        return (a + b + c) / 3.0;\n    }\n}",
    "tests": [
      [
        "1 2 2",
        "1.6666666666666667"
      ],
      [
        "3 6 9",
        "6.0"
      ]
    ],
    "hints": [
      "Check the helper’s return type and whether it can be called from static main.",
      "A double return type alone does not fix integer division in an expression.",
      "A returned value needs a separate print statement."
    ],
    "errors": [
      [
        3,
        "Syntax",
        "Void must be lowercase void."
      ],
      [
        5,
        "Syntax",
        "nextInt needs parentheses."
      ],
      [
        8,
        "Syntax",
        "Store the decimal return value in double result."
      ],
      [
        9,
        "Logic",
        "Actually print result; the helper only returns it."
      ],
      [
        12,
        "Syntax",
        "Use static so main can call the helper directly."
      ],
      [
        12,
        "Syntax",
        "Use double as the return type, not void."
      ],
      [
        13,
        "Logic",
        "Use / 3.0 for decimal division."
      ]
    ],
    "broken": "import java.util.Scanner;\npublic class Main {\n    public static Void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        int a = input.nextInt;\n        int b = input.nextInt();\n        int c = input.nextInt();\n        int result = average(a, b, c);\n        // Display the result here\n        input.close();\n    }\n    public void average(int a, int b, int c) {\n        return (a + b + c) / 3;\n    }\n}",
    "trace": "average(1, 2, 2) receives three values and returns 5 / 3.0. No output occurs until main calls println.",
    "variant": "Change the sample values and solve again from a blank page."
  },
  {
    "id": 7,
    "title": "A safe text summary",
    "kind": "code",
    "course": [
      "lesson22.html"
    ],
    "reason": "2.2 Strings: length versus last index, substring end, and empty input.",
    "prompt": "Read a full line. Print its length. If it is empty, print Empty text. Otherwise print its last character and first three characters (or the whole text if shorter than three). Preserve spaces and punctuation.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String text = input.nextLine();\n        System.out.println(\"Length: \" + text.length());\n        if (text.length() == 0) {\n            System.out.println(\"Empty text\");\n        } else {\n            System.out.println(\"Last: \" + text.charAt(text.length() - 1));\n            int end = 3;\n            if (text.length() < 3) { end = text.length(); }\n            System.out.println(\"Prefix: \" + text.substring(0, end));\n        }\n        input.close();\n    }\n}",
    "tests": [
      [
        "Kevin",
        "Length: 5\nLast: n\nPrefix: Kev"
      ],
      [
        "Hi",
        "Length: 2\nLast: i\nPrefix: Hi"
      ],
      [
        "Empty line",
        "Length: 0\nEmpty text"
      ]
    ],
    "hints": [
      "Draw the indices before selecting a character.",
      "Check for empty text before calling charAt.",
      "substring includes start and excludes end."
    ],
    "errors": [],
    "broken": null,
    "trace": null,
    "variant": "Print the last three characters instead, or the whole text if it is shorter than three."
  },
  {
    "id": 8,
    "title": "Repair text comparison and formatting",
    "kind": "debug",
    "course": [
      "lesson22.html",
      "lesson23.html"
    ],
    "reason": "2.2–2.3: String content, bounds and saving returned Strings.",
    "prompt": "Read a name. If it equals Kevin ignoring case, print Welcome. For nonempty input print its last character. Then print the uppercase name and its first three characters, or the whole name if shorter. Repair every issue, preserving this goal.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String name = input.nextLine();\n        if (name.equalsIgnoreCase(\"Kevin\")) {\n            System.out.println(\"Welcome\");\n        }\n        int n = name.length();\n        if (n > 0) {\n            System.out.println(name.charAt(n - 1));\n        }\n        name = name.toUpperCase();\n        System.out.println(name);\n        int end = 3;\n        if (name.length() < 3) { end = name.length(); }\n        System.out.println(name.substring(0, end));\n        input.close();\n    }\n}",
    "tests": [
      [
        "kevin",
        "Welcome\nn\nKEVIN\nKEV"
      ],
      [
        "Al",
        "l\nAL\nAL"
      ],
      [
        "Empty line",
        "Two empty output lines; no Welcome or last character."
      ]
    ],
    "hints": [
      "Use equalsIgnoreCase for the specified content comparison.",
      "Guard empty input and use the last valid index.",
      "String transformations return a new value; substring requires a valid end."
    ],
    "errors": [
      [
        6,
        "Logic",
        "Use equalsIgnoreCase(\"Kevin\"), not reference comparison ==."
      ],
      [
        7,
        "Syntax",
        "Use println, not printLn."
      ],
      [
        9,
        "Syntax",
        "Use length()."
      ],
      [
        10,
        "Runtime",
        "For nonempty text use charAt(n - 1); for empty text skip this output."
      ],
      [
        11,
        "Logic",
        "Assign name = name.toUpperCase()."
      ],
      [
        13,
        "Logic",
        "Start at index 0 for the first characters."
      ],
      [
        13,
        "Runtime",
        "Cap the end at the length when input has fewer than three characters."
      ]
    ],
    "broken": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String name = input.nextLine();\n        if (name == \"Kevin\") {\n            System.out.printLn(\"Welcome\");\n        }\n        int n = name.length;\n        System.out.println(name.charAt(n));\n        name.toUpperCase();\n        System.out.println(name);\n        System.out.println(name.substring(1, 3));\n        input.close();\n    }\n}",
    "trace": null,
    "variant": "Change the sample values and solve again from a blank page."
  },
  {
    "id": 9,
    "title": "Count and find a character",
    "kind": "code",
    "course": [
      "lesson23.html"
    ],
    "reason": "2.3: scan every character, return after the loop and handle a missing match.",
    "prompt": "Write countChar(String text, char target) and charFinder(char target, String text). Count matching characters case-sensitively. charFinder returns the text before the first match, or the whole text when absent. In main read a full line and a one-character line; retry the target input until its length is one. Print Prefix and Count.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String text = input.nextLine();\n        String targetText = input.nextLine();\n        while (targetText.length() != 1) { targetText = input.nextLine(); }\n        char target = targetText.charAt(0);\n        System.out.println(\"Prefix: \" + charFinder(target, text));\n        System.out.println(\"Count: \" + countChar(text, target));\n        input.close();\n    }\n    public static int countChar(String text, char target) {\n        int count = 0;\n        for (int i = 0; i < text.length(); i++) {\n            if (text.charAt(i) == target) { count++; }\n        }\n        return count;\n    }\n    public static String charFinder(char target, String text) {\n        int index = text.indexOf(target);\n        if (index == -1) { return text; }\n        return text.substring(0, index);\n    }\n}",
    "tests": [
      [
        "banana; target a",
        "Prefix: b\nCount: 3"
      ],
      [
        "Welcome; target z",
        "Prefix: Welcome\nCount: 0"
      ],
      [
        "Empty line; target a",
        "Prefix: \nCount: 0"
      ]
    ],
    "hints": [
      "Keep count outside the loop; start i at zero.",
      "char values compare with ==.",
      "indexOf can return -1; never pass that as a substring end."
    ],
    "errors": [],
    "broken": null,
    "trace": null,
    "variant": "Use AaA with targets A and a. Predict the different counts and prefixes before running."
  },
  {
    "id": 10,
    "title": "Repair the whole character counter",
    "kind": "debug",
    "course": [
      "lesson23.html"
    ],
    "reason": "Cumulative review: avoid missed errors in loop boundaries, counting and return paths.",
    "prompt": "Read a text line and print how often lowercase a appears. Correct the helper and main. Empty text must return 0. Then trace banana in a table with i, character, match and count.",
    "solution": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String text = input.nextLine();\n        System.out.println(countChar(text, 'a'));\n        input.close();\n    }\n    public static int countChar(String text, char target) {\n        int count = 0;\n        for (int i = 0; i < text.length(); i++) {\n            if (text.charAt(i) == target) {\n                count++;\n            }\n        }\n        return count;\n    }\n}",
    "tests": [
      [
        "banana",
        "3"
      ],
      [
        "aaaa",
        "4"
      ],
      [
        "Empty line",
        "0"
      ]
    ],
    "hints": [
      "Check the char argument’s quotes and each method call.",
      "Include index 0; exclude length().",
      "A successful scan must return after all characters, even if the text is empty."
    ],
    "errors": [
      [
        6,
        "Syntax",
        "Pass char 'a', not String \"a\"."
      ],
      [
        9,
        "Syntax",
        "Declare static int countChar so main can call it and print its int return value."
      ],
      [
        11,
        "Logic",
        "Initialize i at 0 to include the first character."
      ],
      [
        11,
        "Runtime",
        "Use i < text.length() to avoid charAt(length())."
      ],
      [
        12,
        "Syntax",
        "Use text.charAt(i), not square brackets."
      ],
      [
        12,
        "Syntax",
        "Use == to compare characters."
      ],
      [
        13,
        "Logic",
        "count = +1 sets it to 1; use count++."
      ],
      [
        15,
        "Logic",
        "Move return count after the loop to visit all characters."
      ],
      [
        16,
        "Syntax",
        "Ensure a return after the loop, including the empty-text path; moving the return fixes this too."
      ]
    ],
    "broken": "import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner input = new Scanner(System.in);\n        String text = input.nextLine();\n        System.out.println(countChar(text, \"a\"));\n        input.close();\n    }\n    public int countChar(String text, char target) {\n        int count = 0;\n        for (int i = 1; i <= text.length(); i++) {\n            if (text.charAt[i] = target) {\n                count = +1;\n            }\n            return count;\n        }\n    }\n}",
    "trace": "banana: i 0..5 visits b,a,n,a,n,a; count after each visit is 0,1,1,2,2,3. At i=6 the condition is false; return 3.",
    "variant": "Change the sample values and solve again from a blank page."
  }
];
