import React, { useState, useEffect } from "react";
import { ethers } from "ethers";

/* ----------- CONFIG ----------- */
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_tutor", "type": "address"},
      {"internalType": "string", "name": "_subject", "type": "string"},
      {"internalType": "uint256", "name": "_minutes", "type": "uint256"},
      {"internalType": "uint256", "name": "_start", "type": "uint256"}
    ],
    "name": "bookSession",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "cancelSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "uint256", "name": "rating", "type": "uint256"},
      {"internalType": "string", "name": "feedback", "type": "string"}
    ],
    "name": "completeSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "confirmSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"}],
    "name": "registerStudent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_name", "type": "string"},
      {"internalType": "string[]", "name": "_subjects", "type": "string[]"},
      {"internalType": "uint256", "name": "_hourlyRate", "type": "uint256"}
    ],
    "name": "registerTutor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "startSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "tutor", "type": "address"}],
    "name": "getTutorInfo",
    "outputs": [
      {"internalType": "bool", "name": "isRegistered", "type": "bool"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "hourlyRate", "type": "uint256"},
      {"internalType": "uint256", "name": "avgRating", "type": "uint256"},
      {"internalType": "uint256", "name": "ratingCount", "type": "uint256"},
      {"internalType": "uint256", "name": "completedSessions", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "student", "type": "address"}],
    "name": "getStudentInfo",
    "outputs": [
      {"internalType": "bool", "name": "isRegistered", "type": "bool"},
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "totalSpent", "type": "uint256"},
      {"internalType": "uint256", "name": "sessionsCompleted", "type": "uint256"},
      {"internalType": "uint256", "name": "sessionCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}],
    "name": "getSessionBasicInfo",
    "outputs": [
      {"internalType": "address", "name": "student", "type": "address"},
      {"internalType": "address", "name": "tutor", "type": "address"},
      {"internalType": "string", "name": "subject", "type": "string"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "student", "type": "address"}],
    "name": "studentHistory",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "tutor", "type": "address"}],
    "name": "tutorSubjects",
    "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sessionCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const SESSION_STATUS = {
  0: "Pending",
  1: "Confirmed", 
  2: "In Progress",
  3: "Completed",
  4: "Cancelled",
  5: "Disputed"
};

export default function App() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userProfile, setUserProfile] = useState({ type: null, data: null });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState("0");
  const [tutorData, setTutorData] = useState(null);

  // Form states
  const [tutorForm, setTutorForm] = useState({
    name: "",
    subjects: "",
    hourlyRate: ""
  });
  const [studentForm, setStudentForm] = useState({ name: "" });
  const [bookingForm, setBookingForm] = useState({
    tutorAddress: "",
    subject: "",
    duration: "60",
    startTime: ""
  });

  const checkNetwork = async () => {
    if (!window?.ethereum) return false;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isOnSepolia = chainId === SEPOLIA_CHAIN_ID;
      setIsCorrectNetwork(isOnSepolia);
      
      if (!isOnSepolia) {
        setStatus("❌ Please switch to Sepolia testnet");
      }
      
      return isOnSepolia;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia test network',
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'SEP',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!window?.ethereum) {
      setStatus("❌ MetaMask not detected. Install it and reload.");
      return;
    }

    try {
      const isOnCorrectNetwork = await checkNetwork();
      if (!isOnCorrectNetwork) {
        setStatus("❌ Please switch to Sepolia testnet");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      if (!CONTRACT_ADDRESS) {
        setStatus("❌ Contract address not configured in .env file");
        return;
      }

      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        setStatus("❌ No contract found at address: " + CONTRACT_ADDRESS);
        return;
      }

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setAccount(address);
      setContract(contractInstance);
      setStatus("✅ Connected to Sepolia!");
      
      await loadUserProfile(contractInstance, address);
      
    } catch (err) {
      console.error(err);
      setStatus("❌ Connection failed: " + err.message);
    }
  };

  const loadUserProfile = async (contractInstance, address) => {
    try {
      const tutorInfo = await contractInstance.getTutorInfo(address);
      if (tutorInfo.isRegistered) {
        setUserProfile({ type: "tutor", data: tutorInfo });
        await loadTutorSessions(contractInstance, address);
        return;
      }

      const studentInfo = await contractInstance.getStudentInfo(address);
      if (studentInfo.isRegistered) {
        setUserProfile({ type: "student", data: studentInfo });
        await loadStudentSessions(contractInstance, address);
        return;
      }

      setUserProfile({ type: null, data: null });
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const loadStudentSessions = async (contractInstance, studentAddress) => {
    try {
      const sessionIds = await contractInstance.studentHistory(studentAddress);
      const sessionDetails = await Promise.all(
        sessionIds.map(async (id) => {
          try {
            const basicInfo = await contractInstance.getSessionBasicInfo(id);
            return {
              id: id.toString(),
              student: basicInfo.student,
              tutor: basicInfo.tutor,
              subject: basicInfo.subject,
              duration: basicInfo.duration.toString(),
              status: SESSION_STATUS[basicInfo.status]
            };
          } catch (err) {
            console.error(`Error loading session ${id}:`, err);
            return null;
          }
        })
      );
      setSessions(sessionDetails.filter(session => session !== null));
    } catch (err) {
      console.error("Error loading student sessions:", err);
    }
  };

  const loadTutorSessions = async (contractInstance, tutorAddress) => {
    try {
      const sessionCounter = await contractInstance.sessionCounter();
      const allSessions = [];
      
      const totalSessions = sessionCounter.toNumber();
      
      for (let i = 1; i <= totalSessions; i++) {
        try {
          const basicInfo = await contractInstance.getSessionBasicInfo(i);
          if (basicInfo.tutor.toLowerCase() === tutorAddress.toLowerCase()) {
            allSessions.push({
              id: i.toString(),
              student: basicInfo.student,
              tutor: basicInfo.tutor,
              subject: basicInfo.subject,
              duration: basicInfo.duration.toString(),
              status: SESSION_STATUS[basicInfo.status]
            });
          }
        } catch (err) {
          continue;
        }
      }
      setSessions(allSessions);
    } catch (err) {
      console.error("Error loading tutor sessions:", err);
    }
  };

  // FIXED: Cost estimation with proper validation
  const updateCostEstimate = async () => {
    if (!contract || !bookingForm.tutorAddress || !bookingForm.duration) {
      setEstimatedCost("0");
      setTutorData(null);
      return;
    }

    try {
      if (!ethers.utils.isAddress(bookingForm.tutorAddress)) {
        setEstimatedCost("Invalid address");
        setTutorData(null);
        return;
      }

      const duration = parseInt(bookingForm.duration);
      if (isNaN(duration) || duration < 30 || duration > 480) {
        setEstimatedCost("Duration must be 30-480 minutes");
        return;
      }

      const tutorInfo = await contract.getTutorInfo(bookingForm.tutorAddress);
      
      if (!tutorInfo.isRegistered) {
        setEstimatedCost("Tutor not registered");
        setTutorData(null);
        return;
      }

      if (!tutorInfo.isActive) {
        setEstimatedCost("Tutor inactive");
        setTutorData(null);
        return;
      }

      const subjects = await contract.tutorSubjects(bookingForm.tutorAddress);
      setTutorData({ ...tutorInfo, subjects });

      // Calculate cost exactly as contract does
      const hourlyRate = tutorInfo.hourlyRate;
      const cost = hourlyRate.mul(duration).div(60);
      
      setEstimatedCost(ethers.utils.formatEther(cost));

    } catch (err) {
      console.error("Cost estimation error:", err);
      setEstimatedCost("Error calculating cost");
      setTutorData(null);
    }
  };

  const registerTutor = async () => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      const subjects = tutorForm.subjects.split(",").map(s => s.trim()).filter(s => s);
      
      if (!tutorForm.name || subjects.length === 0 || !tutorForm.hourlyRate) {
        throw new Error("Please fill all fields");
      }

      const rate = ethers.utils.parseEther(tutorForm.hourlyRate);
      
      const tx = await contract.registerTutor(tutorForm.name, subjects, rate, {
        gasLimit: 500000
      });
      await tx.wait();
      
      setStatus("✅ Tutor registration successful!");
      await loadUserProfile(contract, account);
      setTutorForm({ name: "", subjects: "", hourlyRate: "" });
    } catch (err) {
      console.error("Registration error:", err);
      setStatus("❌ Registration failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  const registerStudent = async () => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      if (!studentForm.name) {
        throw new Error("Please enter your name");
      }

      const tx = await contract.registerStudent(studentForm.name, {
        gasLimit: 200000
      });
      await tx.wait();
      
      setStatus("✅ Student registration successful!");
      await loadUserProfile(contract, account);
      setStudentForm({ name: "" });
    } catch (err) {
      console.error("Registration error:", err);
      setStatus("❌ Registration failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  // FIXED: Enhanced booking function
  const bookSession = async () => {
    if (!contract || !isCorrectNetwork) return;
    
    // Enhanced validation
    if (!ethers.utils.isAddress(bookingForm.tutorAddress)) {
      setStatus("❌ Invalid tutor address format");
      return;
    }

    if (!bookingForm.subject.trim()) {
      setStatus("❌ Please enter a subject");
      return;
    }

    if (!bookingForm.startTime) {
      setStatus("❌ Please select start time");
      return;
    }

    const duration = parseInt(bookingForm.duration);
    if (isNaN(duration) || duration < 30 || duration > 480) {
      setStatus("❌ Duration must be between 30 and 480 minutes");
      return;
    }

    const startTime = new Date(bookingForm.startTime).getTime() / 1000;
    const currentTime = Date.now() / 1000;
    
    // Must be at least 5 minutes in the future
    if (startTime <= currentTime + 300) {
      setStatus("❌ Start time must be at least 5 minutes in the future");
      return;
    }

    if (estimatedCost === "0" || estimatedCost.includes("Error") || estimatedCost.includes("Invalid")) {
      setStatus("❌ Cannot calculate session cost - please check tutor address");
      return;
    }

    setLoading(true);
    try {
      // Pre-validate all conditions
      const tutorInfo = await contract.getTutorInfo(bookingForm.tutorAddress);
      
      if (!tutorInfo.isRegistered || !tutorInfo.isActive) {
        throw new Error("Tutor is not active or registered");
      }

      // Check subject certification
      const tutorSubjects = await contract.tutorSubjects(bookingForm.tutorAddress);
      const normalizedSubject = bookingForm.subject.trim();
      const subjectExists = tutorSubjects.some(
        subject => subject.toLowerCase() === normalizedSubject.toLowerCase()
      );
      
      if (!subjectExists) {
        throw new Error(`Tutor is not certified for "${normalizedSubject}". Available subjects: ${tutorSubjects.join(", ")}`);
      }

      // Calculate cost with high precision
      const hourlyRate = tutorInfo.hourlyRate;
      const exactCost = hourlyRate.mul(duration).div(60);
      
      // Add 5% buffer for gas fluctuations and rounding
      const costWithBuffer = exactCost.mul(105).div(100);
      
      console.log("=== BOOKING SESSION ===");
      console.log("Tutor:", bookingForm.tutorAddress);
      console.log("Subject:", normalizedSubject);
      console.log("Duration:", duration, "minutes");
      console.log("Start Time:", new Date(startTime * 1000).toISOString());
      console.log("Hourly Rate:", ethers.utils.formatEther(hourlyRate), "ETH");
      console.log("Exact Cost:", ethers.utils.formatEther(exactCost), "ETH");
      console.log("Cost with Buffer:", ethers.utils.formatEther(costWithBuffer), "ETH");
      
      const startTimestamp = Math.floor(startTime);
      
      // Check balance before transaction
      const balance = await contract.signer.getBalance();
      if (balance.lt(costWithBuffer)) {
        throw new Error("Insufficient ETH balance for this session");
      }

      const tx = await contract.bookSession(
        bookingForm.tutorAddress,
        normalizedSubject,
        duration,
        startTimestamp,
        { 
          value: costWithBuffer,
          gasLimit: 400000
        }
      );
      
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);
      
      setStatus("✅ Session booked successfully!");
      await loadUserProfile(contract, account);
      
      // Reset form
      setBookingForm({ tutorAddress: "", subject: "", duration: "60", startTime: "" });
      setEstimatedCost("0");
      setTutorData(null);
      
    } catch (err) {
      console.error("Booking error:", err);
      
      let errorMessage = "Booking failed";
      
      if (err.reason) {
        // Contract revert reason
        if (err.reason === "Underpaid") {
          errorMessage = "Insufficient payment for session";
        } else if (err.reason === "Tutor uncertified") {
          errorMessage = "Tutor is not certified for this subject";
        } else if (err.reason === "Start past") {
          errorMessage = "Start time must be in the future";
        } else if (err.reason === "Bad duration") {
          errorMessage = "Invalid session duration";
        } else if (err.reason === "Not student") {
          errorMessage = "You must be registered as a student";
        } else {
          errorMessage += ": " + err.reason;
        }
      } else if (err.message) {
        if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH balance";
        } else if (err.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes("replacement transaction underpriced")) {
          errorMessage = "Transaction underpriced, please try again";
        } else {
          errorMessage += ": " + err.message;
        }
      }
      
      setStatus("❌ " + errorMessage);
    }
    setLoading(false);
  };

  const confirmSession = async (sessionId) => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      const tx = await contract.confirmSession(sessionId, { gasLimit: 200000 });
      await tx.wait();
      setStatus("✅ Session confirmed!");
      await loadUserProfile(contract, account);
    } catch (err) {
      console.error("Confirmation error:", err);
      setStatus("❌ Confirmation failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  const startSession = async (sessionId) => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      const tx = await contract.startSession(sessionId, { gasLimit: 200000 });
      await tx.wait();
      setStatus("✅ Session started!");
      await loadUserProfile(contract, account);
    } catch (err) {
      console.error("Start error:", err);
      setStatus("❌ Start failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  const completeSession = async (sessionId, rating, feedback) => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      const tx = await contract.completeSession(sessionId, rating, feedback || "", {
        gasLimit: 300000
      });
      await tx.wait();
      setStatus("✅ Session completed!");
      await loadUserProfile(contract, account);
    } catch (err) {
      console.error("Completion error:", err);
      setStatus("❌ Completion failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  const cancelSession = async (sessionId, reason) => {
    if (!contract || !isCorrectNetwork) return;
    setLoading(true);
    try {
      const tx = await contract.cancelSession(sessionId, reason || "", {
        gasLimit: 300000
      });
      await tx.wait();
      setStatus("✅ Session cancelled!");
      await loadUserProfile(contract, account);
    } catch (err) {
      console.error("Cancellation error:", err);
      setStatus("❌ Cancellation failed: " + (err.reason || err.message));
    }
    setLoading(false);
  };

  // Update cost estimate when form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateCostEstimate();
    }, 500);

    return () => clearTimeout(timer);
  }, [bookingForm.tutorAddress, bookingForm.duration, contract]);

  // Network and account change listeners
  useEffect(() => {
    if (!window?.ethereum) return;
    
    const handleChainChanged = (chainId) => {
      setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID);
      if (chainId !== SEPOLIA_CHAIN_ID) {
        setStatus("❌ Please switch to Sepolia testnet");
        setContract(null);
        setAccount("");
        setUserProfile({ type: null, data: null });
        setSessions([]);
      }
    };
    
    const handleAccountsChanged = (accounts) => {
      if (accounts.length) {
        setAccount(accounts[0]);
        if (contract && isCorrectNetwork) {
          loadUserProfile(contract, accounts[0]);
        }
      } else {
        setAccount("");
        setContract(null);
        setStatus("Not connected");
        setUserProfile({ type: null, data: null });
        setSessions([]);
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    
    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [contract, isCorrectNetwork]);

  useEffect(() => {
    checkNetwork();
  }, []);

  const renderDashboard = () => (
    <div className="space-y-6">
      {!isCorrectNetwork && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Wrong Network</h3>
          <p className="text-red-700 mb-3">Please switch to Sepolia testnet to use this app.</p>
          <button
            onClick={switchToSepolia}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Account Status</h3>
        <p className="text-blue-700">Connected as: {account}</p>
        <p className="text-sm text-blue-600 mt-1">{status}</p>
      </div>

      {userProfile.type === "tutor" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-3">Tutor Profile</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Name:</span> {userProfile.data.name}</div>
            <div><span className="font-medium">Hourly Rate:</span> {ethers.utils.formatEther(userProfile.data.hourlyRate)} ETH</div>
            <div><span className="font-medium">Average Rating:</span> {userProfile.data.avgRating.toString()}/5</div>
            <div><span className="font-medium">Total Sessions:</span> {userProfile.data.completedSessions.toString()}</div>
          </div>
        </div>
      )}

      {userProfile.type === "student" && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-800 mb-3">Student Profile</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Name:</span> {userProfile.data.name}</div>
            <div><span className="font-medium">Total Spent:</span> {ethers.utils.formatEther(userProfile.data.totalSpent)} ETH</div>
            <div><span className="font-medium">Sessions Completed:</span> {userProfile.data.sessionsCompleted.toString()}</div>
            <div><span className="font-medium">Total Sessions:</span> {userProfile.data.sessionCount.toString()}</div>
          </div>
        </div>
      )}

      {userProfile.type === null && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Registration Required</h3>
          <p className="text-yellow-700">You need to register as either a tutor or student to use the platform.</p>
        </div>
      )}
    </div>
  );

  const renderRegistration = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Register as Tutor</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={tutorForm.name}
                onChange={(e) => setTutorForm({...tutorForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
              <input
                type="text"
                placeholder="Math, Physics, Chemistry (comma-separated)"
                value={tutorForm.subjects}
                onChange={(e) => setTutorForm({...tutorForm, subjects: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Enter subjects separated by commas</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (ETH)</label>
              <input
                type="text"
                placeholder="0.01"
                value={tutorForm.hourlyRate}
                onChange={(e) => setTutorForm({...tutorForm, hourlyRate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Your hourly rate in ETH (e.g., 0.01)</p>
            </div>
            <button
              onClick={registerTutor}
              disabled={loading || !isCorrectNetwork}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register as Tutor"}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Register as Student</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={studentForm.name}
                onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={registerStudent}
              disabled={loading || !isCorrectNetwork}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register as Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBooking = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Book a Session</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tutor Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={bookingForm.tutorAddress}
            onChange={(e) => setBookingForm({...bookingForm, tutorAddress: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          {tutorData && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
              <p><strong>Tutor:</strong> {tutorData.name}</p>
              <p><strong>Rate:</strong> {ethers.utils.formatEther(tutorData.hourlyRate)} ETH/hour</p>
              <p><strong>Available Subjects:</strong> {tutorData.subjects.join(", ")}</p>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            placeholder="e.g., Math, Physics, Chemistry"
            value={bookingForm.subject}
            onChange={(e) => setBookingForm({...bookingForm, subject: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          {tutorData && tutorData.subjects.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-gray-500">Available subjects:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tutorData.subjects.map((subject, index) => (
                  <button
                    key={index}
                    onClick={() => setBookingForm({...bookingForm, subject: subject})}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <select
            value={bookingForm.duration}
            onChange={(e) => setBookingForm({...bookingForm, duration: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="180">3 hours</option>
            <option value="240">4 hours</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time
          </label>
          <input
            type="datetime-local"
            value={bookingForm.startTime}
            onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
            min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Must be at least 5 minutes in the future</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Estimated Cost:</span>
            <span className={`text-lg font-semibold ${
              estimatedCost.includes("Error") || estimatedCost.includes("Invalid") || estimatedCost.includes("must be") 
                ? "text-red-600" 
                : "text-blue-600"
            }`}>
              {estimatedCost.includes("Error") || estimatedCost.includes("Invalid") || estimatedCost.includes("must be")
                ? estimatedCost 
                : `${estimatedCost} ETH`
              }
            </span>
          </div>
          {estimatedCost !== "0" && !isNaN(parseFloat(estimatedCost)) && (
            <p className="text-xs text-gray-500 mt-1">
              ≈ ${(parseFloat(estimatedCost) * 2000).toFixed(2)} USD (estimated at $2000/ETH)
            </p>
          )}
        </div>
        
        <button
          onClick={bookSession}
          disabled={
            loading || 
            userProfile.type !== "student" || 
            !isCorrectNetwork || 
            estimatedCost === "0" || 
            estimatedCost.includes("Error") || 
            estimatedCost.includes("Invalid") ||
            estimatedCost.includes("must be") ||
            !bookingForm.tutorAddress ||
            !bookingForm.subject ||
            !bookingForm.startTime
          }
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Booking..." : "Book Session"}
        </button>
        
        {userProfile.type !== "student" && userProfile.type !== null && (
          <p className="text-sm text-red-600">Only registered students can book sessions.</p>
        )}
      </div>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">My Sessions</h3>
      {sessions.length === 0 ? (
        <p className="text-gray-500">No sessions found.</p>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">Session #{session.id}</h4>
                  <p className="text-sm text-gray-600">Subject: {session.subject}</p>
                  <p className="text-sm text-gray-600">Duration: {session.duration} minutes</p>
                  {userProfile.type === "student" && (
                    <p className="text-sm text-gray-600">Tutor: {session.tutor}</p>
                  )}
                  {userProfile.type === "tutor" && (
                    <p className="text-sm text-gray-600">Student: {session.student}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  session.status === "Completed" ? "bg-green-100 text-green-800" :
                  session.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                  session.status === "Confirmed" ? "bg-yellow-100 text-yellow-800" :
                  session.status === "Pending" ? "bg-orange-100 text-orange-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {session.status}
                </span>
              </div>
              
              <div className="flex gap-2 mt-3">
                {userProfile.type === "tutor" && session.status === "Pending" && (
                  <button
                    onClick={() => confirmSession(session.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                
                {session.status === "Confirmed" && (
                  <button
                    onClick={() => startSession(session.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Start Session
                  </button>
                )}
                
                {session.status === "In Progress" && (
                  <button
                    onClick={() => {
                      const rating = prompt("Enter rating (1-5):");
                      if (rating >= 1 && rating <= 5) {
                        const feedback = prompt("Enter feedback (optional):") || "";
                        completeSession(session.id, parseInt(rating), feedback);
                      } else if (rating !== null) {
                        alert("Please enter a rating between 1 and 5");
                      }
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Complete & Rate
                  </button>
                )}

                {(session.status === "Pending" || session.status === "Confirmed") && (
                  <button
                    onClick={() => {
                      const reason = prompt("Enter cancellation reason (optional):") || "";
                      cancelSession(session.id, reason);
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Tutoring Platform (Sepolia)</h1>
        
        {!account ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">Connect your MetaMask wallet to Sepolia testnet</p>
            <div className="space-y-4">
              <button
                onClick={connectWallet}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Wallet
              </button>
              {!isCorrectNetwork && (
                <div>
                  <button
                    onClick={switchToSepolia}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Switch to Sepolia
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>Make sure you have:</p>
              <ul className="list-disc list-inside mt-2">
                <li>MetaMask installed</li>
                <li>Sepolia testnet configured</li>
                <li>Some Sepolia ETH for gas fees</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg mb-6">
              <nav className="flex space-x-8 px-6">
                {["dashboard", "registration", "booking", "sessions"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              {activeTab === "dashboard" && renderDashboard()}
              {activeTab === "registration" && renderRegistration()}
              {activeTab === "booking" && renderBooking()}
              {activeTab === "sessions" && renderSessions()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
