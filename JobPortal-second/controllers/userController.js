const User = require('../models/user');
const bcrypt = require('bcrypt');
const hashedpass = require('../helper/hashedpassword');
const jwt = require('jsonwebtoken');
const Company = require('../models/company');

const registerUser = async(req, res) => {
	const data = req.body;
	try {
		const hashedpassword = hashedpass(data.password);
		const user = await User.create({
			email: data.email,
			password: hashedpassword,
			fullName: data.fullName,
			phone: data.phone,
			address: data.address,
			roleId: data.roleId || 3
		});
		res.status(201).json(user);
	} catch (error) {
		res.status(404).json({message: `User not created ${error.message}`});
	}
}

const getUserById = async(req, res) => {
	const id = req.query.id;
	try {
		const user = await User.findByPk(id);
		if (user) {
			res.status(201).json(user);
		} else {
			res.status(404).json({ message: `User with ${id} id is not found`})
		}
	} catch (error) {
		res.status(404).json({ message: `An error has occured with ${id} id`});
	}
}

const getAllUser = async(req, res) => {
	try {
		const user = await User.findAll();
		res.status(201).json(user);
	}
	catch (error) {
		res.status(404).json({ message: `An error has occured ${ error.message}`});
	}
}


const updateUserById = async (req, res) => {
    try {
        const { fullName, email, password, phone, address } = req.body;
        const userId = req.query.id;

        // Prepare update data
        let updatedData = { fullName, email, phone, address };

        // Hash password only if a new one is provided
        if (password && password.trim() !== "") {
            updatedData.password = hashedpass(password); // Use the helper function
        }

        // Update user in MySQL
        const [updated] = await User.update(updatedData, { where: { id: userId } });

        if (updated === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

const deleteUserById = async (req, res) => {
	const id = req.query.id;
	console.log(id);
	try {
		const result = await User.destroy({
			where: { id:id }
		});
		if (result) {
			res.status(201).json({ message: `User with ${id} id has been deleted !`});
		} else {
			res.status(404).json({ message: `User with ${id} id hasn't been deleted !`});
		}
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: `An error has Occured ${error.message}`});
	}
}

const LoginUser = async(req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.findOne({
			where: {email}
		})
		if (!user) {
			return res.status(404).json({ message: `Invalid credentials !`});
		}
		const validatePassword = await bcrypt.compare(password,user.password);
		if(!validatePassword) {
			return res.status(404).json({ message: `Invalid credentials !`});
		}

		const company = await Company.findOne({ where: { userId: user.id } });
		const companyId = company ? company.id : null;
        if (company) {
			const token = jwt.sign(
				{ id:user.id, email:user.email, roleId:user.roleId, companyId:companyId },
				process.env.JWT_SECRET,
				{ expiresIn: "1hr"}
			);
			res.cookie("token",token,{httpOnly:true})
    		return res.status(200).json({ message: "User logged in successfully", token: token });
			
		}
		else {
			const token = jwt.sign(
				{ id:user.id, email:user.email, roleId:user.roleId },
				process.env.JWT_SECRET,
				{ expiresIn: "1hr"}
			);
			res.cookie("token",token,{httpOnly:true})
			return res.status(200).json({ message: "User logged in successfully", token: token });
		}
	} catch (error) {
		console.log(error);
		if (!res.headersSent) {
            return res.status(500).json({ error: error.message });
        }
	}   
};

const logout = (req, res) => {
    res.clearCookie('token'); 
    res.status(200).send('Logged out successfully');
};

module.exports = {
	registerUser,
	getUserById,
	getAllUser,
	updateUserById,
	deleteUserById,
	LoginUser,
	logout
}