# Python Programming Guide

## Introduction

Python is a high-level, interpreted programming language known for its simplicity and readability. It's widely used in web development, data science, artificial intelligence, and automation.

## Basic Syntax

### Variables and Data Types

```python
# String
name = "Alice"

# Integer
age = 30

# Float
height = 5.6

# Boolean
is_student = True

# List
colors = ["red", "green", "blue"]

# Dictionary
person = {"name": "Bob", "age": 25, "city": "New York"}
```

### Control Structures

#### Conditional Statements

```python
if age >= 18:
    print("You are an adult")
elif age >= 13:
    print("You are a teenager")
else:
    print("You are a child")
```

#### Loops

```python
# For loop
for i in range(5):
    print(f"Number: {i}")

# While loop
count = 0
while count < 3:
    print(f"Count: {count}")
    count += 1
```

### Functions

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

# Function call
message = greet("World")
print(message)  # Output: Hello, World!
```

## Object-Oriented Programming

```python
class Car:
    def __init__(self, make, model, year):
        self.make = make
        self.model = model
        self.year = year
        self.mileage = 0
    
    def drive(self, miles):
        self.mileage += miles
        print(f"Drove {miles} miles. Total mileage: {self.mileage}")
    
    def __str__(self):
        return f"{self.year} {self.make} {self.model}"

# Create and use object
my_car = Car("Toyota", "Camry", 2020)
print(my_car)
my_car.drive(150)
```

## Popular Libraries

- **NumPy**: Numerical computing
- **Pandas**: Data manipulation and analysis
- **Matplotlib**: Data visualization
- **Requests**: HTTP library
- **Flask/Django**: Web frameworks
- **TensorFlow/PyTorch**: Machine learning

## Best Practices

1. Use meaningful variable names
2. Follow PEP 8 style guide
3. Write docstrings for functions and classes
4. Handle exceptions properly
5. Use virtual environments
6. Write tests for your code

Python's philosophy emphasizes code readability and simplicity, making it an excellent choice for both beginners and experienced developers.