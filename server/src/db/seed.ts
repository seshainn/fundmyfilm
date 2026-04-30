import { pool } from "../config/db.js";

const seedProjects = async () => {
  try {
    await pool.query(`
      INSERT INTO projects (title, image, logline, budget, amount_collected)
      VALUES
        ('Untitled Project 1', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708185287/MoviePosters/etkhzqv2fq75pmmgxo3x.jpg', 'A bride fights samurai weilding zombies during her marriage ceremony', 100000000, 0),
        ('Untitled Project s', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708184365/MoviePosters/cwlau0buvbp2ga0qxma4.jpg', 'multiple people claim to be the second coming of christ and compete to return from death', 40000000, 0),
        ('Untitled Project 3', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708184192/MoviePosters/uaenaqyrxmej2mb3pw4i.jpg', 'Two guests at a wedding survive 24 hours in a photo booth after they are accidentally locked in', 10000000, 0),
        ('Untitled Project 4', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708184192/MoviePosters/uaenaqyrxmej2mb3pw4i.jpg', 'A hardworking texas farmer confronts his father-in-law after learning that his wife was forced into an arranged marriage with him', 20000000, 0),
        ('Untitled Project 5', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708184026/MoviePosters/t7mc4tpzxoybkvs7u8l9.jpg', 'Two lovers decide to separate after learning that their single parents are in love', 50000000, 0),
        ('Untitled Project 6', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708183561/MoviePosters/puye7zdx5w9zepqj5a20.jpg', 'Fancy dress competition on a cotton plantation in modern town of Charlestown turns ugly as actors begin to relive a day from the past slave auction', 70000000, 0),
        ('Untitled Project 7', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708183002/MoviePosters/nxjahqcbupdbibgawmwg.jpg', '4 friends accidentally travel back in time to 20000 BC where they try to teach people modern ways of life', 30000000, 0),
        ('Untitled Project 8', 'https://res.cloudinary.com/dey2wnrwy/image/upload/v1708172954/MoviePosters/cfwmyfdxbht0lzzs6q8p.jpg', 'Indian Vikram Betala episode is set in modern day South Korea', 20000000, 0)
    `);

    console.log("✅ Projects seeded");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
};

seedProjects();