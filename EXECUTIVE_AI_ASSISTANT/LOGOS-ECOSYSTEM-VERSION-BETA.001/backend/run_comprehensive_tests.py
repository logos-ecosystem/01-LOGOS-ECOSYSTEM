#!/usr/bin/env python3
"""
Comprehensive test runner for LOGOS ecosystem.
Executes all test suites and generates detailed coverage reports.
"""

import os
import sys
import subprocess
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
import argparse


class TestRunner:
    """Manages test execution and reporting."""
    
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.project_root = Path(__file__).parent
        self.test_dir = self.project_root / "tests"
        self.coverage_dir = self.project_root / "coverage_reports"
        self.results = {
            "timestamp": datetime.utcnow().isoformat(),
            "suites": {},
            "coverage": {},
            "summary": {}
        }
    
    def setup_environment(self):
        """Set up test environment."""
        print("🔧 Setting up test environment...")
        
        # Ensure coverage directory exists
        self.coverage_dir.mkdir(exist_ok=True)
        
        # Set environment variables
        os.environ["ENVIRONMENT"] = "test"
        os.environ["TESTING"] = "true"
        os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_db.sqlite"
        
        # Clean previous test artifacts
        test_db = self.project_root / "test_db.sqlite"
        if test_db.exists():
            test_db.unlink()
        
        print("✅ Environment ready")
    
    def run_unit_tests(self):
        """Run unit tests."""
        print("\n🧪 Running Unit Tests...")
        
        cmd = [
            "pytest",
            "tests/unit",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "-m", "unit",
            "--cov=src",
            "--cov-report=term-missing",
            "--cov-report=html:coverage_reports/unit",
            "--cov-report=xml:coverage_reports/unit.xml",
            "--cov-report=json:coverage_reports/unit.json",
            "--junit-xml=coverage_reports/unit-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["unit"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def run_integration_tests(self):
        """Run integration tests."""
        print("\n🔗 Running Integration Tests...")
        
        cmd = [
            "pytest",
            "tests/integration",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "-m", "integration",
            "--cov=src",
            "--cov-append",
            "--cov-report=term-missing",
            "--cov-report=html:coverage_reports/integration",
            "--cov-report=xml:coverage_reports/integration.xml",
            "--junit-xml=coverage_reports/integration-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["integration"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def run_e2e_tests(self):
        """Run end-to-end tests."""
        print("\n🚀 Running End-to-End Tests...")
        
        cmd = [
            "pytest",
            "tests/e2e",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "-m", "e2e",
            "--cov=src",
            "--cov-append",
            "--cov-report=term-missing",
            "--cov-report=html:coverage_reports/e2e",
            "--cov-report=xml:coverage_reports/e2e.xml",
            "--junit-xml=coverage_reports/e2e-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["e2e"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def run_security_tests(self):
        """Run security tests."""
        print("\n🔒 Running Security Tests...")
        
        cmd = [
            "pytest",
            "tests/security",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "--cov=src",
            "--cov-append",
            "--junit-xml=coverage_reports/security-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["security"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def run_performance_tests(self):
        """Run performance tests."""
        print("\n⚡ Running Performance Tests...")
        
        cmd = [
            "pytest",
            "tests/performance",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "-m", "slow",
            "--junit-xml=coverage_reports/performance-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["performance"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def run_agent_tests(self):
        """Run specialized agent tests."""
        print("\n🤖 Running Agent Tests...")
        
        cmd = [
            "pytest",
            "tests/unit/test_specialized_agents_comprehensive.py",
            "-v" if self.verbose else "-q",
            "--tb=short",
            "--cov=src/services/agents",
            "--cov-append",
            "--junit-xml=coverage_reports/agents-junit.xml"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        self.results["suites"]["agents"] = {
            "passed": "failed" not in result.stdout.lower(),
            "output": result.stdout,
            "errors": result.stderr
        }
        
        return result.returncode == 0
    
    def analyze_coverage(self):
        """Analyze test coverage results."""
        print("\n📊 Analyzing Coverage...")
        
        # Parse XML coverage report
        coverage_file = self.coverage_dir / "e2e.xml"
        if coverage_file.exists():
            tree = ET.parse(coverage_file)
            root = tree.getroot()
            
            # Extract coverage metrics
            coverage_data = root.attrib
            line_rate = float(coverage_data.get('line-rate', 0)) * 100
            branch_rate = float(coverage_data.get('branch-rate', 0)) * 100
            
            self.results["coverage"] = {
                "line_coverage": f"{line_rate:.2f}%",
                "branch_coverage": f"{branch_rate:.2f}%",
                "meets_threshold": line_rate >= 80
            }
            
            # Identify uncovered files
            uncovered_files = []
            for package in root.findall('.//package'):
                for class_elem in package.findall('class'):
                    filename = class_elem.get('filename')
                    class_line_rate = float(class_elem.get('line-rate', 0))
                    if class_line_rate < 0.8:  # Less than 80% coverage
                        uncovered_files.append({
                            "file": filename,
                            "coverage": f"{class_line_rate * 100:.2f}%"
                        })
            
            self.results["coverage"]["files_below_threshold"] = uncovered_files
            
            return line_rate >= 80
        
        return False
    
    def generate_report(self):
        """Generate comprehensive test report."""
        print("\n📝 Generating Test Report...")
        
        # Calculate summary
        total_suites = len(self.results["suites"])
        passed_suites = sum(1 for s in self.results["suites"].values() if s["passed"])
        
        self.results["summary"] = {
            "total_suites": total_suites,
            "passed_suites": passed_suites,
            "failed_suites": total_suites - passed_suites,
            "success_rate": f"{(passed_suites / total_suites * 100):.2f}%",
            "coverage_met": self.results["coverage"].get("meets_threshold", False)
        }
        
        # Write JSON report
        report_path = self.coverage_dir / "test_report.json"
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        # Generate HTML summary
        self.generate_html_summary()
        
        # Print summary to console
        self.print_summary()
    
    def generate_html_summary(self):
        """Generate HTML summary report."""
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>LOGOS Test Report - {self.results['timestamp']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .summary {{ background: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .passed {{ color: green; }}
        .failed {{ color: red; }}
        table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        .coverage-met {{ background-color: #d4edda; }}
        .coverage-not-met {{ background-color: #f8d7da; }}
    </style>
</head>
<body>
    <h1>LOGOS Ecosystem Test Report</h1>
    <p>Generated: {self.results['timestamp']}</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Test Suites: {self.results['summary']['total_suites']}</p>
        <p>Passed: <span class="passed">{self.results['summary']['passed_suites']}</span></p>
        <p>Failed: <span class="failed">{self.results['summary']['failed_suites']}</span></p>
        <p>Success Rate: {self.results['summary']['success_rate']}</p>
        <p>Coverage: {self.results['coverage'].get('line_coverage', 'N/A')} 
           <span class="{'coverage-met' if self.results['coverage'].get('meets_threshold') else 'coverage-not-met'}">
           ({'✅ Meets' if self.results['coverage'].get('meets_threshold') else '❌ Below'} 80% threshold)
           </span>
        </p>
    </div>
    
    <h2>Test Suite Results</h2>
    <table>
        <tr>
            <th>Suite</th>
            <th>Status</th>
            <th>Details</th>
        </tr>
        {''.join(f'''
        <tr>
            <td>{suite}</td>
            <td class="{'passed' if data['passed'] else 'failed'}">
                {'✅ Passed' if data['passed'] else '❌ Failed'}
            </td>
            <td>View logs</td>
        </tr>
        ''' for suite, data in self.results['suites'].items())}
    </table>
    
    <h2>Coverage Reports</h2>
    <ul>
        <li><a href="unit/index.html">Unit Test Coverage</a></li>
        <li><a href="integration/index.html">Integration Test Coverage</a></li>
        <li><a href="e2e/index.html">E2E Test Coverage</a></li>
    </ul>
    
    <h2>Files Below Coverage Threshold</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Coverage</th>
        </tr>
        {''.join(f'''
        <tr>
            <td>{file['file']}</td>
            <td>{file['coverage']}</td>
        </tr>
        ''' for file in self.results['coverage'].get('files_below_threshold', [])[:10])}
    </table>
</body>
</html>
"""
        
        report_path = self.coverage_dir / "index.html"
        with open(report_path, 'w') as f:
            f.write(html_content)
    
    def print_summary(self):
        """Print test summary to console."""
        print("\n" + "="*60)
        print("TEST EXECUTION SUMMARY")
        print("="*60)
        
        for suite, data in self.results["suites"].items():
            status = "✅ PASSED" if data["passed"] else "❌ FAILED"
            print(f"{suite.upper()}: {status}")
        
        print("\n" + "-"*60)
        print(f"Total Coverage: {self.results['coverage'].get('line_coverage', 'N/A')}")
        print(f"Coverage Threshold: {'✅ MET' if self.results['coverage'].get('meets_threshold') else '❌ NOT MET'}")
        
        if not self.results['coverage'].get('meets_threshold'):
            print("\n⚠️  Coverage is below 80% threshold!")
            print("Files needing improvement:")
            for file in self.results['coverage'].get('files_below_threshold', [])[:5]:
                print(f"  - {file['file']}: {file['coverage']}")
        
        print("\n" + "="*60)
        print(f"Overall Result: {'✅ ALL TESTS PASSED' if all(s['passed'] for s in self.results['suites'].values()) else '❌ SOME TESTS FAILED'}")
        print("="*60)
    
    def run_all_tests(self):
        """Run all test suites."""
        self.setup_environment()
        
        # Run test suites in order
        suites = [
            ("Unit Tests", self.run_unit_tests),
            ("Integration Tests", self.run_integration_tests),
            ("E2E Tests", self.run_e2e_tests),
            ("Security Tests", self.run_security_tests),
            ("Performance Tests", self.run_performance_tests),
            ("Agent Tests", self.run_agent_tests)
        ]
        
        all_passed = True
        
        for suite_name, test_func in suites:
            try:
                passed = test_func()
                all_passed = all_passed and passed
            except Exception as e:
                print(f"❌ Error running {suite_name}: {e}")
                all_passed = False
        
        # Analyze coverage
        coverage_met = self.analyze_coverage()
        
        # Generate reports
        self.generate_report()
        
        return all_passed and coverage_met


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Run comprehensive tests for LOGOS ecosystem")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--suite", choices=["unit", "integration", "e2e", "security", "performance", "agents"], 
                       help="Run specific test suite only")
    
    args = parser.parse_args()
    
    runner = TestRunner(verbose=args.verbose)
    
    if args.suite:
        # Run specific suite
        suite_map = {
            "unit": runner.run_unit_tests,
            "integration": runner.run_integration_tests,
            "e2e": runner.run_e2e_tests,
            "security": runner.run_security_tests,
            "performance": runner.run_performance_tests,
            "agents": runner.run_agent_tests
        }
        
        runner.setup_environment()
        success = suite_map[args.suite]()
        runner.analyze_coverage()
        runner.generate_report()
    else:
        # Run all tests
        success = runner.run_all_tests()
    
    # Open coverage report in browser
    if success:
        print("\n🌐 Opening coverage report in browser...")
        import webbrowser
        coverage_index = runner.coverage_dir / "index.html"
        webbrowser.open(f"file://{coverage_index.absolute()}")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()