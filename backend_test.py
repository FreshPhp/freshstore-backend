import requests
import sys
import json
from datetime import datetime
import uuid

class StreamShopAPITester:
    def __init__(self, base_url="https://stream-shop-9.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.session_id = str(uuid.uuid4())
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_seed_database(self):
        """Test database seeding"""
        return self.run_test("Seed Database", "POST", "seed", 200)

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"test_user_{timestamp}@streamshop.com",
            "password": "TestPass123!",
            "firstName": "Test",
            "lastName": "User",
            "phone": "+5511999999999"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True, response
        return False, {}

    def test_login_user(self, email, password):
        """Test user login"""
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True, response
        return False, {}

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_products(self):
        """Test get all products"""
        success, response = self.run_test("Get All Products", "GET", "products", 200)
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} products")
            return True, response
        elif success:
            self.log_test("Get All Products - Data Validation", False, "No products found or invalid format")
            return False, {}
        return False, {}

    def test_get_product_by_id(self, product_id):
        """Test get product by ID"""
        return self.run_test(
            f"Get Product by ID ({product_id[:8]}...)",
            "GET",
            f"products/{product_id}",
            200
        )

    def test_get_cart(self):
        """Test get cart"""
        return self.run_test(
            f"Get Cart (session: {self.session_id[:8]}...)",
            "GET",
            f"cart/{self.session_id}",
            200
        )

    def test_update_cart(self, product_id):
        """Test update cart"""
        cart_data = [
            {
                "productId": product_id,
                "quantity": 2
            }
        ]
        
        return self.run_test(
            "Update Cart",
            "POST",
            f"cart/{self.session_id}",
            200,
            data=cart_data
        )

    def test_validate_coupon_valid(self):
        """Test validate valid coupon"""
        return self.run_test(
            "Validate Valid Coupon (BEMVINDO10)",
            "GET",
            "coupons/validate/BEMVINDO10",
            200
        )

    def test_validate_coupon_invalid(self):
        """Test validate invalid coupon"""
        return self.run_test(
            "Validate Invalid Coupon (INVALIDO)",
            "GET",
            "coupons/validate/INVALIDO",
            404
        )

    def test_get_orders(self):
        """Test get user orders (requires authentication)"""
        return self.run_test("Get User Orders", "GET", "orders", 200)

    def test_process_payment(self, product_id, product_name, product_price):
        """Test payment processing (mock)"""
        payment_data = {
            "paymentData": {
                "token": "mock_token_123",
                "installments": 1,
                "paymentMethodId": "visa"
            },
            "customerInfo": {
                "email": "test@streamshop.com",
                "firstName": "Test",
                "lastName": "Customer",
                "phone": "+5511999999999",
                "address": "Rua Teste, 123",
                "city": "São Paulo",
                "postalCode": "01234-567",
                "country": "BR"
            },
            "items": [
                {
                    "productId": product_id,
                    "name": product_name,
                    "price": product_price,
                    "quantity": 1
                }
            ],
            "subtotal": product_price,
            "discount": 0,
            "total": product_price,
            "couponCode": None,
            "userId": self.user_id,
            "sessionId": self.session_id
        }
        
        return self.run_test(
            "Process Payment (Mock)",
            "POST",
            "payments/process",
            200,
            data=payment_data
        )

    def test_get_payment_config(self):
        """Test get payment configuration"""
        return self.run_test("Get Payment Config", "GET", "payments/config", 200)

def main():
    print("🚀 Starting StreamShop API Tests")
    print("=" * 50)
    
    tester = StreamShopAPITester()
    
    # Test 1: Health Check
    tester.test_health_check()
    
    # Test 2: Seed Database
    tester.test_seed_database()
    
    # Test 3: User Registration
    success, user_data = tester.test_register_user()
    if not success:
        print("❌ Registration failed, stopping auth-dependent tests")
        return 1
    
    # Test 4: Get Current User
    tester.test_get_me()
    
    # Test 5: Get Products
    success, products = tester.test_get_products()
    if not success or not products:
        print("❌ No products available, stopping product-dependent tests")
        return 1
    
    # Use first product for testing
    first_product = products[0]
    product_id = first_product['id']
    product_name = first_product['name']
    product_price = first_product['price']
    
    # Test 6: Get Product by ID
    tester.test_get_product_by_id(product_id)
    
    # Test 7: Cart Operations
    tester.test_get_cart()
    tester.test_update_cart(product_id)
    tester.test_get_cart()  # Verify cart was updated
    
    # Test 8: Coupon Validation
    tester.test_validate_coupon_valid()
    tester.test_validate_coupon_invalid()
    
    # Test 9: Orders
    tester.test_get_orders()
    
    # Test 10: Payment Processing
    tester.test_process_payment(product_id, product_name, product_price)
    
    # Test 11: Payment Config
    tester.test_get_payment_config()
    
    # Test 12: Verify order was created
    tester.test_get_orders()
    
    # Print Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Print failed tests
    failed_tests = [test for test in tester.test_results if not test['success']]
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   • {test['name']}: {test['details']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())