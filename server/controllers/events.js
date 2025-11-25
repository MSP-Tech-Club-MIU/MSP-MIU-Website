import { or, Sequelize } from "sequelize";
const {Event}= require('../models/Event');

const addEvent = async (req, res) => {

        try{
const {name, description, event_date, created_at}= req.body;


const newEvent= await Event.create({
    name,
    description, 
    event_date, 
    created_at
})


res.status(201).json({message: "Event created successfully", event: newEvent});






} catch (error) { console.error(error);
        res.status(500).json({ error: 'Failed to create event' });
    }


}

const getAllEvents = async (req, res) => {
    try{
        const events = await Event.findAll({
  order: [['event_date', 'ASC']]
});
res.status(200).json(events);
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch events' });
}

}


module.exports = { addEvent,
                   getAllEvents

};